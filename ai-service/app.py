import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use system environment variables

app = FastAPI(title="Formula Generation Service")

# CORS configuration for UI5 app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your UI5 app domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LangChain LLM
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY not set. Please configure environment variable.")

# Initialize ChatOpenAI with LangChain
# Easy to switch to other providers: ChatAnthropic, ChatGoogleGenerativeAI, etc.
llm = None
if OPENAI_API_KEY:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.1,  # Low temperature for deterministic output
        max_tokens=500,
        model_kwargs={
            "top_p": 0.95,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0
        },
        api_key=OPENAI_API_KEY
    )

# Few-shot examples for LangChain prompt template
FEW_SHOT_EXAMPLES = [
    {"input": "Calculate monthly deferred payment", "output": "totalAmount / term"},
    {"input": "Calculate deferred payment with cap percentage", "output": "(totalAmount * (capPercent / 100)) / term"},
    {"input": "Calculate non-deferred immediate payment", "output": "totalAmount"},
    {"input": "Calculate quarterly amortization", "output": "(totalAmount / term) * (amortizationFrequency === 'Quarterly' ? 3 : 1)"},
    {"input": "Calculate annual deferred with cap", "output": "((totalAmount * (capPercent / 100)) / term) * (amortizationFrequency === 'Annually' ? 12 : 1)"},
    {"input": "Calculate biweekly payment schedule", "output": "(totalAmount / term) / (amortizationFrequency === 'Biweekly' ? 2 : 1)"},
    {"input": "Calculate payment based on payroll classification W2", "output": "payrollClassification === 'W2' ? totalAmount / term : totalAmount * 0.9 / term"}
]

# System prompt to constrain AI behavior
SYSTEM_PROMPT = """You are a specialized formula generation assistant for a Commissions Accounting application. 

Your ONLY purpose is to generate JavaScript formulas for amortization calculations.

Available variables:
- totalAmount: Total commission amount (Number)
- capPercent: Cap percentage to apply (Integer, 0-100)
- term: Number of payment periods (Integer)
- amortizationFrequency: Payment frequency (String: 'Monthly', 'Quarterly', 'Annually', 'Biweekly')
- payrollClassification: Employee type (String: 'W2', '1099', 'International')

Rules:
1. Generate ONLY executable JavaScript expressions
2. Use arithmetic operators: +, -, *, /, ()
3. Use conditional (ternary) operators when needed: condition ? value1 : value2
4. Use comparison operators: ===, !==, <, >, <=, >=
5. Use logical operators: &&, ||
6. Do NOT use:
   - Variable declarations (let, const, var)
   - Function definitions
   - Loops or iterations
   - External libraries
   - Async/await or promises
7. Formula must return a single numeric value
8. Keep formulas concise and readable

If the user asks about anything outside amortization formulas (e.g., weather, general chat, unrelated topics), respond with:
"I can only help with amortization formula generation. Please ask about commission calculations, deferred payments, cap percentages, payment frequencies, or payroll classifications."

Examples:
User: "Calculate deferred payment over term"
Assistant: totalAmount / term

User: "Apply 50% cap and split monthly"
Assistant: (totalAmount * (capPercent / 100)) / term

User: "What's the weather today?"
Assistant: I can only help with amortization formula generation. Please ask about commission calculations, deferred payments, cap percentages, payment frequencies, or payroll classifications.
"""

class FormulaRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None

class FormulaResponse(BaseModel):
    formula: str
    explanation: str
    isValid: bool
    error: Optional[str] = None

def validate_formula(formula: str) -> tuple[bool, Optional[str]]:
    """
    Validate that the formula is safe and uses only allowed variables
    Returns: (is_valid, error_message)
    """
    # Check for forbidden keywords
    forbidden_keywords = [
        'function', 'eval', 'Function', 'require', 'import', 'export',
        'fetch', 'XMLHttpRequest', 'setTimeout', 'setInterval',
        'let', 'const', 'var', 'class', 'new', 'this', 'window', 'document',
        'process', 'global', '__', 'constructor', 'prototype'
    ]
    
    formula_lower = formula.lower()
    for keyword in forbidden_keywords:
        if keyword.lower() in formula_lower:
            return False, f"Forbidden keyword detected: {keyword}"
    
    # Check that only allowed variables are used
    allowed_vars = ['totalAmount', 'capPercent', 'term', 'amortizationFrequency', 'payrollClassification']
    
    # Extract potential variable names (simple regex)
    potential_vars = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', formula)
    
    for var in potential_vars:
        # Skip string literals and known safe terms
        if var in ['true', 'false', 'null', 'undefined', 'Monthly', 'Quarterly', 'Annually', 'Biweekly', 'W2', 'International']:
            continue
        if var not in allowed_vars:
            return False, f"Unknown variable: {var}. Only allowed: {', '.join(allowed_vars)}"
    
    # Basic syntax check - must have balanced parentheses
    if formula.count('(') != formula.count(')'):
        return False, "Unbalanced parentheses"
    
    return True, None

@app.get("/")
async def root():
    return {
        "service": "Formula Generation Service",
        "status": "running",
        "llm_configured": bool(llm),
        "model": llm.model_name if llm else None
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "llm_configured": bool(llm),
        "model": llm.model_name if llm else None
    }

@app.post("/api/generate-formula", response_model=FormulaResponse)
async def generate_formula(request: FormulaRequest):
    """
    Generate a formula based on natural language prompt using LangChain
    """
    if not llm:
        raise HTTPException(
            status_code=503,
            detail="LLM not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    if not request.prompt or len(request.prompt.strip()) == 0:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    try:
        # Create few-shot prompt template with LangChain
        example_prompt = ChatPromptTemplate.from_messages([
            ("human", "{input}"),
            ("ai", "{output}")
        ])
        
        few_shot_prompt = FewShotChatMessagePromptTemplate(
            example_prompt=example_prompt,
            examples=FEW_SHOT_EXAMPLES,
        )
        
        # Create final prompt template
        final_prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            few_shot_prompt,
            ("human", "{input}")
        ])
        
        # Create LangChain chain: prompt -> llm -> output parser
        chain = final_prompt | llm | StrOutputParser()
        
        # Invoke the chain
        generated_text = chain.invoke({"input": request.prompt}).strip()
        
        # Check if AI rejected the request (off-topic)
        if "I can only help with amortization formula generation" in generated_text:
            return FormulaResponse(
                formula="",
                explanation=generated_text,
                isValid=False,
                error="Out of scope request"
            )
        
        # Extract formula (remove any explanatory text)
        # The AI should return just the formula, but handle edge cases
        formula_lines = generated_text.split('\n')
        formula = formula_lines[0].strip()
        
        # Remove common prefixes
        prefixes = ['Formula:', 'Assistant:', 'Result:', '=']
        for prefix in prefixes:
            if formula.startswith(prefix):
                formula = formula[len(prefix):].strip()
        
        # Remove markdown code blocks if present
        formula = formula.replace('```javascript', '').replace('```', '').strip()
        
        # Validate the formula
        is_valid, error = validate_formula(formula)
        
        if not is_valid:
            return FormulaResponse(
                formula=formula,
                explanation=f"Generated formula failed validation: {error}",
                isValid=False,
                error=error
            )
        
        # Generate explanation
        explanation = f"Generated formula for: '{request.prompt}'"
        
        return FormulaResponse(
            formula=formula,
            explanation=explanation,
            isValid=True,
            error=None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating formula: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
