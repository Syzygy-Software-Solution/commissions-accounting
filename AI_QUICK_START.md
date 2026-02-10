# 🚀 Quick Start Guide - AI Formula Generation

This guide helps you get the AI-powered formula generation feature running locally or deploy it to Cloud Foundry.

## 🎯 What This Feature Does

Generates executable JavaScript formulas from natural language descriptions for commission amortization calculations.

**Example**:
- **Input**: "Calculate monthly deferred payment with cap percentage"
- **Output**: `(totalAmount * (capPercent / 100)) / term`
- **Test**: See sample amortization schedule with predefined data

## 📋 Prerequisites

### For Local Testing:
- Python 3.11+
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### For Cloud Foundry Deployment:
- SAP BTP Cloud Foundry account
- Cloud Foundry CLI (`cf`)
- MBT Build Tool (`mbt`)
- Node.js 18+
- OpenAI API Key

## 🏃 Local Development Setup

### 1. Set Up AI Service

Run the setup script:

```bash
./setup-ai-local.sh
```

Or manually:

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure OpenAI API Key

```bash
export OPENAI_API_KEY='sk-proj-your-key-here'
```

Or create `ai-service/.env`:
```
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Start AI Service

```bash
cd ai-service
source venv/bin/activate
python app.py
```

Service runs at: http://localhost:8080

### 4. Test AI Service

```bash
# Health check
curl http://localhost:8080/health

# Generate formula
curl -X POST http://localhost:8080/api/generate-formula \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Calculate monthly deferred payment"}'
```

### 5. Start CAP Application

In a separate terminal:

```bash
npm install
cds watch
```

Application runs at: http://localhost:4004

### 6. Test in UI

1. Navigate to **Configuration** → **Amortization Calculation**
2. Enter prompt: "Calculate monthly deferred payment with cap"
3. Click **Generate Formula**
4. Click **Test Formula** to see results

## ☁️ Cloud Foundry Deployment

### 1. Update OpenAI Key

Edit `mta.yaml` line 92:

```yaml
properties:
  OPENAI_API_KEY: 'sk-proj-YOUR-ACTUAL-KEY-HERE'
```

### 2. Build and Deploy

```bash
# Build MTA archive
mbt build

# Login to Cloud Foundry
cf login -a <api-endpoint> -o <org> -s <space>

# Deploy
cf deploy mta_archives/commissions_accounting_1.0.0.mtar
```

### 3. Verify Deployment

```bash
# Check app status
cf apps

# Test AI service health
cf app commissions_accounting-ai-service
curl https://your-ai-route.cfapps.sap.hana.ondemand.com/health

# Get application URL
cf html5-list -di commissions_accounting-destination-service -u
```

## 📁 Project Structure

```
commissions-accounting/
├── ai-service/                      # 🤖 Python AI Service
│   ├── app.py                       # FastAPI application
│   ├── requirements.txt             # Python dependencies
│   ├── Procfile                     # CF process definition
│   ├── runtime.txt                  # Python version
│   └── README.md                    # Detailed AI service docs
│
├── app/commissions_accounting/      # 🖥️ UI5 Frontend
│   └── webapp/
│       ├── view/Main.view.xml       # Updated with AI UI
│       └── controller/Main.controller.js  # AI integration logic
│
├── srv/                             # 🔧 CAP Backend Services
├── db/                              # 💾 Database Schema
├── mta.yaml                         # 🚀 Deployment Configuration
├── setup-ai-local.sh               # 🛠️ Local setup script
├── AI_DEPLOYMENT_GUIDE.md          # 📖 Full deployment docs
└── IMPLEMENTATION_SUMMARY.md       # 📝 Implementation details
```

## 🎨 UI Features

### AI Formula Generator Panel
- **Prompt Input**: Natural language description
- **Generate Button**: Calls AI service (with AI icon ✨)
- **Test Button**: Tests formula with sample data
- **Status Indicator**: Shows generation progress

### Formula Code Panel
- **Code Editor**: Displays current/generated formulas
- **Language Selector**: 16 languages (JavaScript default)
- **Default Formula**: Loaded on initialization

### Test Results Panel
- **Test Scenario**: Shows input parameters
- **Formula Result**: Calculated payment amount
- **Schedule Table**: 6-period sample amortization

## 🧪 Testing Examples

### Valid Prompts (Will Work):
✅ "Calculate monthly deferred payment"
✅ "Apply 50% cap and divide by term"
✅ "Different payment for W2 vs 1099 employees"
✅ "Quarterly payment with annual multiplier"
✅ "Biweekly payment schedule calculation"

### Invalid Prompts (Will Be Rejected):
❌ "What's the weather today?"
❌ "Tell me a joke"
❌ "How do I cook pasta?"

Response: *"I can only help with amortization formula generation..."*

## 🔐 Security Features

1. **Formula Validation**: Rejects dangerous code
2. **Variable Whitelist**: Only allows predefined variables
3. **Syntax Checking**: Validates JavaScript syntax
4. **Scope Control**: AI constrained to formula generation
5. **Safe Evaluation**: Uses isolated Function() constructor

## 💰 Cost Estimation

**GPT-4o-mini Pricing**:
- ~$0.0002 per formula generation
- 1,000 formulas/day ≈ $6/month
- 10,000 formulas/day ≈ $60/month

Monitor usage at: https://platform.openai.com/usage

## 🐛 Troubleshooting

### AI Service Won't Start

```bash
# Check logs
cf logs commissions_accounting-ai-service --recent

# Verify API key
cf env commissions_accounting-ai-service

# Restart service
cf restart commissions_accounting-ai-service
```

### Formula Generation Fails

1. Check OpenAI API key is valid
2. Verify AI service is running
3. Check browser console for errors
4. Test API directly with curl

### Test Results Not Showing

1. Ensure formula was generated successfully
2. Check JavaScript console for errors
3. Verify formula returns a number
4. Try clearing and regenerating formula

## 📚 Documentation

- **AI Service Details**: [ai-service/README.md](ai-service/README.md)
- **Full Deployment Guide**: [AI_DEPLOYMENT_GUIDE.md](AI_DEPLOYMENT_GUIDE.md)
- **Implementation Summary**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **API Documentation**: http://localhost:8080/docs (when running locally)

## 🔄 Common Workflows

### Update Formula Logic

1. Modify `ai-service/app.py` (e.g., add examples to `FEW_SHOT_EXAMPLES`)
2. Locally: Restart `python app.py`
3. Cloud: `cf push commissions_accounting-ai-service`

### Change AI Model

Edit `ai-service/app.py` line 168:
```python
model="gpt-4o-mini",  # Change to "gpt-4o" or "gpt-4-turbo"
```

### Scale AI Service

```bash
# More instances for high traffic
cf scale commissions_accounting-ai-service -i 3

# More memory if needed
cf scale commissions_accounting-ai-service -m 1G
```

## 🆘 Getting Help

1. **Check Logs**: `cf logs commissions_accounting-ai-service`
2. **Test Health Endpoint**: `curl https://your-route/health`
3. **Review API Docs**: Visit `/docs` endpoint
4. **Check OpenAI Status**: https://status.openai.com

## 📝 Next Steps After Setup

1. ✅ Test various prompts to understand capabilities
2. ✅ Monitor OpenAI API usage and costs
3. ✅ Gather user feedback on generated formulas
4. ✅ Consider adding more few-shot examples
5. ✅ Plan formula persistence feature (future)

---

**Need more details?** See the full guides:
- [AI Service README](ai-service/README.md) - Technical details
- [Deployment Guide](AI_DEPLOYMENT_GUIDE.md) - Complete CF setup
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Architecture details

**Ready to deploy?** 🚀
```bash
./setup-ai-local.sh  # Local testing
# or
mbt build && cf deploy mta_archives/*.mtar  # Cloud deployment
```
