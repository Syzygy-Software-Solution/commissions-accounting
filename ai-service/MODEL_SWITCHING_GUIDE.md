# LLM Model Switching Guide

Thanks to **LangChain**, switching between different LLM providers requires minimal code changes. This guide shows you how to switch from the default GPT-4o-mini to other models.

## Current Configuration

**File**: `app.py` lines 25-37

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1,
    max_tokens=500,
    model_kwargs={
        "top_p": 0.95,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    },
    api_key=OPENAI_API_KEY
)
```

## Switching Models

### Option 1: OpenAI GPT-4o (More Capable)

**Cost**: ~10x more expensive than GPT-4o-mini  
**Quality**: Better reasoning, more accurate formulas

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",  # Changed from gpt-4o-mini
    temperature=0.1,
    max_tokens=500,
    model_kwargs={
        "top_p": 0.95,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    },
    api_key=os.getenv("OPENAI_API_KEY")
)
```

**Environment Variable**: Keep `OPENAI_API_KEY`

---

### Option 2: Anthropic Claude 3.5 Haiku

**Cost**: Competitive with GPT-4o-mini  
**Quality**: Excellent for structured outputs

**Step 1**: Update `requirements.txt`:
```
langchain-anthropic==0.1.11
```

**Step 2**: Update `app.py`:
```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-5-haiku-20241022",
    temperature=0.1,
    max_tokens=500,
    api_key=os.getenv("ANTHROPIC_API_KEY")
)
```

**Step 3**: Set environment variable:
```bash
export ANTHROPIC_API_KEY='sk-ant-your-key-here'
```

Or in `mta.yaml`:
```yaml
properties:
  ANTHROPIC_API_KEY: 'sk-ant-your-key-here'
```

**Get API Key**: https://console.anthropic.com/

---

### Option 3: Anthropic Claude 3.5 Sonnet (Most Capable)

**Cost**: Similar to GPT-4o  
**Quality**: Top-tier reasoning

```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",  # More capable than Haiku
    temperature=0.1,
    max_tokens=500,
    api_key=os.getenv("ANTHROPIC_API_KEY")
)
```

---

### Option 4: Google Gemini 1.5 Flash

**Cost**: Very competitive, often cheaper  
**Quality**: Good for structured tasks

**Step 1**: Update `requirements.txt`:
```
langchain-google-genai==1.0.1
```

**Step 2**: Update `app.py`:
```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0.1,
    max_tokens=500,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
```

**Step 3**: Set environment variable:
```bash
export GOOGLE_API_KEY='your-google-api-key'
```

**Get API Key**: https://makersuite.google.com/app/apikey

---

### Option 5: Google Gemini 1.5 Pro

**Cost**: Similar to GPT-4o  
**Quality**: High-quality reasoning

```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",  # More capable than Flash
    temperature=0.1,
    max_tokens=500,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
```

---

### Option 6: Azure OpenAI (Enterprise)

**Cost**: Same as OpenAI, but billed through Azure  
**Quality**: Same as OpenAI models  
**Benefits**: Enterprise compliance, data residency, private endpoints

**Step 1**: Update `app.py`:
```python
from langchain_openai import AzureChatOpenAI

llm = AzureChatOpenAI(
    azure_deployment="your-gpt-4o-mini-deployment",  # Your deployment name
    api_version="2024-02-01",
    temperature=0.1,
    max_tokens=500,
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)
```

**Step 2**: Set environment variables:
```bash
export AZURE_OPENAI_API_KEY='your-azure-key'
export AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com/'
```

**Setup**: Create Azure OpenAI resource at https://portal.azure.com

---

### Option 7: Local Models (Ollama)

**Cost**: Free (runs on your hardware)  
**Quality**: Varies by model  
**Benefits**: Complete privacy, no API costs

**Step 1**: Install Ollama: https://ollama.ai

**Step 2**: Pull a model:
```bash
ollama pull llama3.1:8b
```

**Step 3**: Update `requirements.txt`:
```
langchain-community==0.0.38
```

**Step 4**: Update `app.py`:
```python
from langchain_community.llms import Ollama

llm = Ollama(
    model="llama3.1:8b",
    temperature=0.1,
)
```

**Note**: Requires Ollama server running locally or accessible via network.

---

## Cost Comparison

| Provider | Model | Cost (per 1M tokens) | Quality | Speed |
|----------|-------|---------------------|---------|-------|
| OpenAI | GPT-4o-mini | $0.15 in / $0.60 out | ⭐⭐⭐⭐ | ⚡⚡⚡ |
| OpenAI | GPT-4o | $2.50 in / $10.00 out | ⭐⭐⭐⭐⭐ | ⚡⚡ |
| Anthropic | Claude 3.5 Haiku | $0.80 in / $4.00 out | ⭐⭐⭐⭐ | ⚡⚡⚡ |
| Anthropic | Claude 3.5 Sonnet | $3.00 in / $15.00 out | ⭐⭐⭐⭐⭐ | ⚡⚡ |
| Google | Gemini 1.5 Flash | $0.075 in / $0.30 out | ⭐⭐⭐ | ⚡⚡⚡ |
| Google | Gemini 1.5 Pro | $1.25 in / $5.00 out | ⭐⭐⭐⭐⭐ | ⚡⚡ |
| Ollama | Llama 3.1 8B | Free (local) | ⭐⭐⭐ | ⚡⚡ |

*Estimated for formula generation workload (~$0.0002 per formula with GPT-4o-mini)*

---

## Multi-Model Configuration (Advanced)

You can configure fallback models in case the primary fails:

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Primary model
try:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.1,
        max_tokens=500,
        api_key=os.getenv("OPENAI_API_KEY")
    )
except Exception as e:
    print(f"OpenAI not available: {e}")
    # Fallback to Anthropic
    llm = ChatAnthropic(
        model="claude-3-5-haiku-20241022",
        temperature=0.1,
        max_tokens=500,
        api_key=os.getenv("ANTHROPIC_API_KEY")
    )
```

---

## Model Selection Criteria

### For Production (Cost-Effective):
✅ **GPT-4o-mini** (default) - Best balance of cost/quality  
✅ **Gemini 1.5 Flash** - Cheapest option, good quality

### For Production (High Quality):
✅ **GPT-4o** - Most accurate, proven track record  
✅ **Claude 3.5 Sonnet** - Excellent for structured outputs

### For Enterprise:
✅ **Azure OpenAI** - Compliance, data residency, SLAs

### For Privacy/Cost Savings:
✅ **Ollama (Llama 3.1)** - On-premises, no API costs

---

## Testing After Switch

After changing models, test thoroughly:

```bash
# 1. Test health endpoint
curl http://localhost:8080/health

# 2. Test formula generation
curl -X POST http://localhost:8080/api/generate-formula \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Calculate monthly deferred payment"}'

# 3. Test off-topic rejection
curl -X POST http://localhost:8080/api/generate-formula \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the weather?"}'

# 4. Test complex formula
curl -X POST http://localhost:8080/api/generate-formula \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Calculate quarterly payment for W2 employees with 75% cap"}'
```

Expected behavior should remain consistent across models.

---

## Deployment After Switch

**Update `mta.yaml`**:
```yaml
properties:
  # For OpenAI
  OPENAI_API_KEY: 'sk-proj-...'
  
  # For Anthropic
  # ANTHROPIC_API_KEY: 'sk-ant-...'
  
  # For Google
  # GOOGLE_API_KEY: 'your-google-key'
  
  # For Azure
  # AZURE_OPENAI_API_KEY: 'your-azure-key'
  # AZURE_OPENAI_ENDPOINT: 'https://your-resource.openai.azure.com/'
```

**Redeploy**:
```bash
mbt build
cf deploy mta_archives/commissions_accounting_1.0.0.mtar
```

---

## Monitoring Different Models

Track performance metrics by model:

```python
import time

start_time = time.time()
result = llm.invoke(prompt)
latency = time.time() - start_time

print(f"Model: {llm.model_name if hasattr(llm, 'model_name') else 'unknown'}")
print(f"Latency: {latency:.2f}s")
```

Compare:
- Response time
- Formula quality/accuracy
- Cost per request
- Error rates

---

## Need Help?

- **LangChain Docs**: https://python.langchain.com/docs/integrations/chat/
- **Model Providers**:
  - OpenAI: https://platform.openai.com/docs
  - Anthropic: https://docs.anthropic.com
  - Google: https://ai.google.dev/docs
  - Azure: https://learn.microsoft.com/azure/ai-services/openai/

**Recommendation**: Start with GPT-4o-mini (default), upgrade to GPT-4o or Claude 3.5 Sonnet if you need better quality.
