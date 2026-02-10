# AI-Powered Formula Generation - Deployment Guide

This guide covers deploying the complete Commissions Accounting application with the AI Formula Generation feature to SAP Business Technology Platform (BTP) Cloud Foundry.

## Prerequisites

✅ SAP BTP Cloud Foundry account with:
  - HANA Cloud instance
  - XSUAA service
  - HTML5 Application Repository
  - Destination service

✅ OpenAI API Key (from https://platform.openai.com/api-keys)

✅ Development tools:
  - Cloud Foundry CLI (`cf`)
  - MBT Build Tool (`mbt`)
  - Node.js 18+
  - Python 3.11+

## Step 1: Configure OpenAI API Key

Before deployment, update the OpenAI API key in `mta.yaml`:

```yaml
- name: commissions_accounting-ai-service
  type: python
  path: ai-service
  properties:
    OPENAI_API_KEY: 'sk-proj-...'  # Replace with your actual key
```

⚠️ **Security Note**: For production, use User-Provided Services or BTP Secrets instead of hardcoding:

```bash
cf cups openai-service -p '{"api_key":"your-api-key-here"}'
```

Then reference in `mta.yaml`:
```yaml
requires:
  - name: openai-service
```

## Step 2: Build the MTA Archive

From the project root directory:

```bash
# Install dependencies
npm install

# Build MTA archive
mbt build
```

This creates: `mta_archives/commissions_accounting_1.0.0.mtar`

## Step 3: Deploy to Cloud Foundry

```bash
# Login to Cloud Foundry
cf login -a <api-endpoint> -o <org> -s <space>

# Deploy the application
cf deploy mta_archives/commissions_accounting_1.0.0.mtar
```

Deployment includes:
- ✅ CAP Node.js service (`commissions_accounting-srv`)
- ✅ HANA DB deployer (`commissions_accounting-db-deployer`)
- ✅ UI5 application (`commissionsaccounting`)
- ✅ Python AI service (`commissions_accounting-ai-service`)
- ✅ Destination configurations
- ✅ XSUAA authentication

## Step 4: Verify Deployment

1. **Check application status**:
   ```bash
   cf apps
   ```

   You should see:
   ```
   commissions_accounting-srv          started
   commissions_accounting-ai-service   started
   ```

2. **Check AI service health**:
   ```bash
   cf app commissions_accounting-ai-service
   ```

   Get the route URL and test:
   ```bash
   curl https://your-ai-service-route.cfapps.sap.hana.ondemand.com/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "openai_configured": true
   }
   ```

## Step 5: Access the Application

1. **Get application URL**:
   ```bash
   cf html5-list -di commissions_accounting-destination-service -u
   ```

2. **Open in browser**: Navigate to the provided URL

3. **Test AI Formula Generation**:
   - Navigate to **Configuration** → **Amortization Calculation**
   - Enter a prompt: "Calculate monthly deferred payment"
   - Click **Generate Formula**
   - Click **Test Formula** to see results

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SAP BTP Cloud Foundry                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐   ┌──────────────┐ │
│  │   UI5 App    │─────>│   CAP Srv    │   │  Python AI   │ │
│  │  (Frontend)  │      │  (Node.js)   │   │   Service    │ │
│  └──────────────┘      └──────┬───────┘   └──────┬───────┘ │
│         │                     │                   │          │
│         │              ┌──────▼──────┐    ┌───────▼───────┐ │
│         │              │ HANA Cloud  │    │ OpenAI API    │ │
│         │              │  Database   │    │ (External)    │ │
│         │              └─────────────┘    └───────────────┘ │
│         │                                                    │
│  ┌──────▼──────────────────────────────────────────┐       │
│  │        XSUAA Authentication Service              │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Details

### Python AI Service

**Buildpack**: `python_buildpack`
**Memory**: 512MB
**Disk**: 1024MB
**Instances**: 1 (can scale up)

**Dependencies** (from `requirements.txt`):
- fastapi==0.109.0
- uvicorn==0.27.0
- openai==1.12.0
- pydantic==2.6.0

### Environment Variables

Set in `mta.yaml`:
```yaml
properties:
  OPENAI_API_KEY: 'your-key-here'
  PORT: 8080  # Auto-assigned by CF
```

## Scaling Considerations

### AI Service Scaling

For high-traffic scenarios:

```bash
# Scale to 3 instances
cf scale commissions_accounting-ai-service -i 3

# Increase memory if needed
cf scale commissions_accounting-ai-service -m 1G
```

### Cost Optimization

**OpenAI API Costs** (GPT-4o-mini):
- Input: $0.15/1M tokens (~$0.0001 per request)
- Output: $0.60/1M tokens (~$0.0001 per response)
- **Average**: ~$0.0002 per formula generation

**Estimated costs**:
- 1,000 formulas/day = $0.20/day = $6/month
- 10,000 formulas/day = $2/day = $60/month

### Monitoring

Enable application logs:

```bash
# View AI service logs
cf logs commissions_accounting-ai-service --recent

# Stream live logs
cf logs commissions_accounting-ai-service
```

Monitor for:
- ✅ Formula generation latency
- ✅ OpenAI API errors
- ✅ Invalid formula rejections
- ✅ Out-of-scope requests

## Updating the Deployment

After making code changes:

```bash
# Rebuild
mbt build

# Redeploy (preserves data)
cf deploy mta_archives/commissions_accounting_1.0.0.mtar
```

### Updating Only AI Service

For faster AI service updates without full redeployment:

```bash
cd ai-service
cf push commissions_accounting-ai-service -b python_buildpack
```

## Troubleshooting

### Issue: AI service fails to start

**Check**:
```bash
cf logs commissions_accounting-ai-service --recent
```

**Common causes**:
- Missing/invalid OpenAI API key
- Dependencies installation failure
- Port binding issues

**Solution**:
```bash
# Check environment variables
cf env commissions_accounting-ai-service

# Restart service
cf restart commissions_accounting-ai-service
```

### Issue: Formula generation returns 503

**Cause**: OpenAI API key not configured

**Solution**: Update `OPENAI_API_KEY` in `mta.yaml` and redeploy

### Issue: CORS errors in browser

**Cause**: AI service URL not in destination

**Solution**: Verify destination configuration includes `ai-service-api`

### Issue: Test results not showing

**Check browser console** for JavaScript errors

**Verify** formula syntax is valid JavaScript

## Security Best Practices

1. **API Key Management**:
   - ❌ Don't commit API keys to Git
   - ✅ Use environment variables
   - ✅ Use BTP Secrets for production

2. **Formula Validation**:
   - ✅ All formulas validated server-side
   - ✅ Forbidden keywords blocked
   - ✅ Variable whitelist enforced

3. **Authentication**:
   - ✅ XSUAA protects all endpoints
   - ✅ User authentication required

## Feature Usage

### In the Application

1. **Navigate**: Configuration → Amortization Calculation
2. **Enter Prompt**: "Calculate quarterly payment with 75% cap"
3. **Generate**: Click "Generate Formula" button
4. **Review**: Formula appears in code editor
5. **Test**: Click "Test Formula" to see sample results
6. **Use**: Copy formula for implementation (future feature)

### Example Prompts

✅ "Calculate monthly deferred payment"
✅ "Apply 50% cap and divide by term"
✅ "Calculate payment for biweekly frequency"
✅ "Different calculation for W2 vs 1099"
✅ "Quarterly payment with annual multiplier"

❌ "What's the weather?" (Out of scope, will be rejected)
❌ "Tell me a joke" (Out of scope, will be rejected)

## Support and Maintenance

### Regular Maintenance

- **Monitor OpenAI API usage** via OpenAI dashboard
- **Review logs** for errors and anomalies
- **Update dependencies** regularly for security patches
- **Scale instances** based on usage patterns

### Getting Help

- Check logs: `cf logs commissions_accounting-ai-service`
- Review AI service README: `ai-service/README.md`
- Test API directly: `curl https://your-route/health`

## Next Steps

After successful deployment:

1. ✅ Test formula generation with various prompts
2. ✅ Monitor OpenAI API costs
3. ✅ Gather user feedback on generated formulas
4. ✅ Consider adding LangSmith for monitoring (future)
5. ✅ Implement formula persistence (future feature)

---

**Deployment completed!** 🚀 Your AI-powered formula generation feature is now live.
