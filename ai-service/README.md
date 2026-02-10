# AI Formula Generation Service

This is a Python FastAPI microservice that generates amortization formulas using **LangChain** for LLM abstraction, currently configured with OpenAI's GPT-4o-mini model.

## Features

- **Natural Language to Formula**: Convert plain English descriptions into executable JavaScript formulas
- **LangChain Integration**: Easy model switching between different LLM providers (OpenAI, Anthropic, Google, etc.)
- **Formula Validation**: Ensures generated formulas are safe and use only allowed variables
- **Constrained AI Responses**: System prompts ensure AI only responds to formula-related queries
- **Few-Shot Learning**: Uses LangChain's few-shot prompt templates for consistent results
- **RESTful API**: Simple HTTP endpoints for easy integration
- **Model Agnostic**: Change LLM providers with minimal code changes

## Setup

### Prerequisites

- Python 3.11+
- OpenAI API Key

### Installation

1. Navigate to the ai-service directory:
   ```bash
   cd ai-service
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY='your-api-key-here'
   ```

### Running Locally

```bash
python app.py
```

The service will start on `http://localhost:8080`

### Testing the API

1. **Health Check**:
   ```bash
   curl http://localhost:8080/health
   ```

2. **Generate Formula**:
   ```bash
   curl -X POST http://localhost:8080/api/generate-formula \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Calculate monthly deferred payment with cap percentage"}'
   ```

   Expected response:
   ```json
   {
     "formula": "(totalAmount * (capPercent / 100)) / term",
     "explanation": "Generated formula for: 'Calculate monthly deferred payment with cap percentage'",
     "isValid": true,
     "error": null
   }
   ```

## Available Variables

The AI service can generate formulas using these variables:

- `totalAmount`: Total commission amount (Number)
- `capPercent`: Cap percentage to apply (Integer, 0-100)
- `term`: Number of payment periods (Integer)
- `amortizationFrequency`: Payment frequency (String: 'Monthly', 'Quarterly', 'Annually', 'Biweekly')
- `payrollClassification`: Employee type (String: 'W2', '1099', 'International')

## Security Features

1. **Formula Validation**: Rejects formulas with dangerous keywords (eval, Function, require, etc.)
2. **Variable Whitelisting**: Only allows predefined variables
3. **Syntax Checking**: Validates parentheses balance and basic syntax
4. **Deterministic Output**: Low temperature (0.1) ensures consistent results
5. **Scope Limitation**: System prompts restrict AI to formula generation only

## Cloud Foundry Deployment

The service is configured for deployment via MTA (Multi-Target Application):

1. **Update OpenAI Key** in `mta.yaml`:
   ```yaml
   properties:
     OPENAI_API_KEY: 'your-actual-api-key'
   ```

2. **Build and Deploy** from project root:
   ```bash
   mbt build
   cf deploy mta_archives/commissions_accounting_1.0.0.mtar
   ```

## Architecture

```
UI5 Frontend (Main.view.xml)
    ↓
    HTTP POST /api/generate-formula
    ↓
Python FastAPI Service
    ↓
    LangChain Prompt Templates
    ├─ System Prompt
    ├─ Few-Shot Examples (7 examples)
    └─ User Input
    ↓
LangChain LLM (ChatOpenAI)
    ↓
GPT-4o-mini (OpenAI API)
    ↓
    LangChain Output Parser
    ↓
    Formula Validation
    ↓
Response: {formula, explanation, isValid}
```

### LangChain Benefits

1. **Model Abstraction**: Switch between OpenAI, Anthropic, Google, Azure with minimal changes
2. **Prompt Management**: Structured prompt templates with system/human/ai roles
3. **Few-Shot Learning**: Built-in FewShotChatMessagePromptTemplate
4. **Chain Composition**: Easy to extend with additional processing steps
5. **Output Parsing**: Automatic string parsing and formatting
6. **Error Handling**: Consistent error patterns across providers

## Cost Estimation

Using GPT-4o-mini:
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Average request cost: ~$0.0002 per formula generation

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required for OpenAI models)
- `PORT`: Port to run the service on (default: 8080)

### Switching LLM Models

Thanks to LangChain, switching models is straightforward. Edit `app.py` lines 25-37:

**Current (OpenAI GPT-4o-mini)**:
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1,
    max_tokens=500,
    api_key=OPENAI_API_KEY
)
```

**Switch to OpenAI GPT-4o**:
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",  # More capable but more expensive
    temperature=0.1,
    max_tokens=500,
    api_key=OPENAI_API_KEY
)
```

**Switch to Anthropic Claude**:
```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-5-haiku-20241022",
    temperature=0.1,
    max_tokens=500,
    api_key=os.getenv("ANTHROPIC_API_KEY")
)
```

**Switch to Google Gemini**:
```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0.1,
    max_tokens=500,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
```

**Switch to Azure OpenAI**:
```python
from langchain_openai import AzureChatOpenAI

llm = AzureChatOpenAI(
    azure_deployment="your-deployment-name",
    temperature=0.1,
    max_tokens=500,
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)
```

### Model Parameters

Current configuration in `app.py`:
- `model`: "gpt-4o-mini"
- `temperature`: 0.1 (deterministic output)
- `max_tokens`: 500
- `top_p`: 0.95

## Error Handling

The service handles:
- Missing API key (503 Service Unavailable)
- Empty prompts (400 Bad Request)
- Invalid formulas (returns `isValid: false`)
- OpenAI API errors (500 Internal Server Error)
- Off-topic requests (returns guidance message)

## Extending the Service

### Adding More Examples

Edit the `FEW_SHOT_EXAMPLES` list in `app.py`:

```python
FEW_SHOT_EXAMPLES = [
    {"input": "Your prompt here", "output": "your formula here"},
    # Add more examples...
]
```

### Modifying System Prompt

Edit the `SYSTEM_PROMPT` constant in `app.py` to adjust AI behavior.

### Adding Model-Specific Logic

LangChain makes it easy to add conditional logic:

```python
if isinstance(llm, ChatOpenAI):
    # OpenAI-specific configuration
    pass
elif isinstance(llm, ChatAnthropic):
    # Anthropic-specific configuration
    pass
```

### Installing Additional Model Providers

Add to `requirements.txt`:
```
langchain-anthropic==0.1.11  # For Claude
langchain-google-genai==1.0.1  # For Gemini
```

## Troubleshooting

1. **"OpenAI API key not configured"**
   - Set the `OPENAI_API_KEY` environment variable

2. **CORS errors in browser**
   - The service allows all origins by default
   - For production, update `allow_origins` in `app.py`

3. **Formula validation fails**
   - Check that the formula uses only allowed variables
   - Ensure no forbidden keywords are present
   - Verify syntax is correct (balanced parentheses)

## Support

For issues or questions, refer to the main project documentation.
