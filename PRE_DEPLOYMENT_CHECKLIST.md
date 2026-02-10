# ✅ Pre-Deployment Checklist

Before deploying the AI-powered formula generation feature, complete this checklist to ensure a smooth deployment.

## 🔑 Prerequisites

### OpenAI API Configuration
- [ ] Have OpenAI API key from https://platform.openai.com/api-keys
- [ ] Verify API key has sufficient credits/quota
- [ ] Test API key works (optional):
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```
- [ ] Update `mta.yaml` line 92 with your actual API key
- [ ] Remove 'YOUR_OPENAI_API_KEY_HERE' placeholder

### SAP BTP Environment
- [ ] Have Cloud Foundry account access
- [ ] HANA Cloud instance provisioned and running
- [ ] XSUAA service configured
- [ ] HTML5 Application Repository available
- [ ] Destination service configured

### Development Tools
- [ ] Cloud Foundry CLI installed (`cf --version`)
- [ ] MBT Build Tool installed (`mbt --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Python 3.11+ installed (for local testing) (`python3 --version`)
- [ ] Git installed (`git --version`)

## 📝 Configuration Updates

### 1. OpenAI API Key (REQUIRED)
- [ ] Edit `mta.yaml`
- [ ] Locate line 92: `OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE'`
- [ ] Replace with: `OPENAI_API_KEY: 'sk-proj-your-actual-key'`
- [ ] Save file
- [ ] **DO NOT commit actual key to Git** (use environment variables in production)

### 2. MTA Configuration Review
- [ ] Review `mta.yaml` module names
- [ ] Verify Python buildpack is `python_buildpack`
- [ ] Check AI service memory (512M) and disk (1024M) are sufficient
- [ ] Confirm destination configurations include `ai-service-api`

### 3. Project Dependencies
- [ ] Run `npm install` in project root
- [ ] Verify `package.json` dependencies are up to date
- [ ] Check Python `requirements.txt` in `ai-service/`

## 🧪 Local Testing (Optional but Recommended)

### Python AI Service
- [ ] Navigate to `ai-service/` directory
- [ ] Create virtual environment: `python3 -m venv venv`
- [ ] Activate: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
- [ ] Install: `pip install -r requirements.txt`
- [ ] Set API key: `export OPENAI_API_KEY='your-key'`
- [ ] Run: `python app.py`
- [ ] Test health: `curl http://localhost:8080/health`
- [ ] Test generation:
  ```bash
  curl -X POST http://localhost:8080/api/generate-formula \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Calculate monthly deferred payment"}'
  ```
- [ ] Verify response contains valid formula
- [ ] Deactivate virtual environment: `deactivate`

### CAP Application (with AI service running)
- [ ] In separate terminal, run: `cds watch`
- [ ] Open: http://localhost:4004
- [ ] Navigate to Configuration → Amortization Calculation
- [ ] Verify default formula is displayed
- [ ] Enter test prompt: "Calculate monthly deferred payment"
- [ ] Click "Generate Formula"
- [ ] Verify formula appears in code editor
- [ ] Click "Test Formula"
- [ ] Verify test results table appears
- [ ] Try off-topic prompt: "What's the weather?"
- [ ] Verify rejection message appears

## 🏗️ Build Process

### Clean Build
- [ ] Remove old build artifacts: `rm -rf mta_archives/`
- [ ] Clear node_modules if needed: `rm -rf node_modules/` then `npm install`
- [ ] Run: `mbt build`
- [ ] Verify `mta_archives/commissions_accounting_1.0.0.mtar` is created
- [ ] Check build log for errors or warnings
- [ ] Verify Python module is included in archive

### Build Verification
- [ ] Archive size is reasonable (~50-100 MB expected)
- [ ] No build errors in console output
- [ ] All modules compiled successfully:
  - [ ] CAP service (Node.js)
  - [ ] DB deployer
  - [ ] UI5 app
  - [ ] Python AI service

## ☁️ Cloud Foundry Deployment

### Pre-Deployment
- [ ] Login to CF: `cf login -a <api> -o <org> -s <space>`
- [ ] Verify login: `cf target`
- [ ] Check quota: `cf space <space-name>`
- [ ] Ensure sufficient memory/disk quota available
- [ ] Backup existing data if upgrading

### Deployment
- [ ] Run: `cf deploy mta_archives/commissions_accounting_1.0.0.mtar`
- [ ] Monitor deployment progress (can take 5-15 minutes)
- [ ] Watch for errors in console output
- [ ] Wait for "Process finished successfully" message

### Post-Deployment Verification
- [ ] Check app status: `cf apps`
- [ ] Verify all apps are "started":
  - [ ] commissions_accounting-srv
  - [ ] commissions_accounting-ai-service
- [ ] Check AI service details: `cf app commissions_accounting-ai-service`
- [ ] Get AI service route/URL
- [ ] Test AI health endpoint:
  ```bash
  curl https://your-ai-service-route/health
  ```
- [ ] Verify response: `{"status": "healthy", "openai_configured": true}`

### Application Access
- [ ] Get HTML5 app URL:
  ```bash
  cf html5-list -di commissions_accounting-destination-service -u
  ```
- [ ] Open URL in browser
- [ ] Login with SAP credentials
- [ ] Navigate to Configuration → Amortization Calculation

## 🔍 Feature Testing in Production

### Basic Functionality
- [ ] Default formula displayed in code editor
- [ ] Prompt input field is visible and editable
- [ ] "Generate Formula" button is enabled when prompt is entered
- [ ] "Test Formula" button is disabled initially
- [ ] Code editor shows JavaScript syntax highlighting

### AI Formula Generation
- [ ] Enter prompt: "Calculate monthly deferred payment"
- [ ] Click "Generate Formula"
- [ ] Status shows: "Generating formula..."
- [ ] Formula appears within 2-5 seconds
- [ ] Status shows: "✅ Formula generated successfully"
- [ ] Formula is displayed in code editor
- [ ] "Test Formula" button is now enabled

### Formula Testing
- [ ] Click "Test Formula"
- [ ] Test results panel appears
- [ ] Test scenario shows parameters (Total: $10,000, Cap: 50%, etc.)
- [ ] Formula result shows payment per period
- [ ] Sample schedule table has 6 periods
- [ ] Each period shows: Period number, Date, Payment, Remaining, Status

### Edge Cases
- [ ] Try empty prompt → "Generate" button should be disabled
- [ ] Try off-topic prompt: "What's the weather?" → Should reject with guidance
- [ ] Try complex prompt: "Calculate quarterly payment for W2 employees with 75% cap over 24 months"
- [ ] Click "Clear" button → All fields reset, default formula reloaded
- [ ] Change language selector → Code editor updates language
- [ ] Generate multiple formulas in succession → All should work

### Error Handling
- [ ] Network error simulation (disconnect) → Should show error message
- [ ] Invalid formula (if AI generates bad code) → Should fail validation
- [ ] Very long prompt (>500 words) → Should handle gracefully

## 📊 Monitoring Setup

### Initial Monitoring
- [ ] View AI service logs: `cf logs commissions_accounting-ai-service --recent`
- [ ] Check for any errors or warnings
- [ ] Monitor OpenAI API usage: https://platform.openai.com/usage
- [ ] Note initial request count and cost

### Ongoing Monitoring
- [ ] Set up log aggregation (optional)
- [ ] Configure alerts for AI service downtime
- [ ] Monitor OpenAI API quota and costs
- [ ] Track formula generation latency
- [ ] Review rejected formulas for patterns

## 🔒 Security Validation

### API Key Security
- [ ] Verify OpenAI key is not exposed in logs
- [ ] Check key is set as environment variable, not hardcoded in code
- [ ] Confirm key is not committed to Git repository
- [ ] Consider using CF user-provided service for production

### Application Security
- [ ] XSUAA authentication is working
- [ ] Users must login to access application
- [ ] AI service requires authentication
- [ ] Formula validation is active (test with dangerous keywords)

### Network Security
- [ ] AI service only accessible via authenticated routes
- [ ] CORS is configured appropriately
- [ ] No sensitive data logged
- [ ] HTTPS is enforced for all endpoints

## 📈 Performance Baseline

### Initial Metrics
- [ ] Formula generation time: _______ seconds (average of 5 tests)
- [ ] Test execution time: _______ milliseconds
- [ ] AI service memory usage: _______ MB (check `cf app`)
- [ ] Concurrent user capacity: Test with multiple users

### Cost Tracking
- [ ] Note OpenAI API starting balance: $_______
- [ ] Calculate cost per formula: ~$0.0002
- [ ] Estimate monthly usage: _______ formulas
- [ ] Projected monthly AI cost: $_______
- [ ] BTP AI service cost: ~$15-20/month

## 📚 Documentation Review

- [ ] Read `AI_QUICK_START.md` - Quick reference guide
- [ ] Review `AI_DEPLOYMENT_GUIDE.md` - Detailed deployment steps
- [ ] Check `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- [ ] Browse `ai-service/README.md` - AI service documentation
- [ ] View `ARCHITECTURE.md` - System architecture diagrams

## 🆘 Troubleshooting Preparation

### Common Issues - Quick Fixes
- [ ] Know how to restart AI service: `cf restart commissions_accounting-ai-service`
- [ ] Know how to check logs: `cf logs commissions_accounting-ai-service --recent`
- [ ] Know how to verify environment: `cf env commissions_accounting-ai-service`
- [ ] Have OpenAI status page bookmarked: https://status.openai.com
- [ ] Have SAP BTP support contact ready

### Rollback Plan
- [ ] Have previous MTA archive backed up (if upgrading)
- [ ] Know rollback command: `cf deploy previous_version.mtar`
- [ ] Document current configuration before deployment
- [ ] Test rollback in dev/test environment first

## ✅ Final Sign-Off

Before going live:
- [ ] All checklist items above are completed
- [ ] Local testing passed
- [ ] Deployment successful
- [ ] Production testing passed
- [ ] Monitoring configured
- [ ] Security validated
- [ ] Documentation reviewed
- [ ] Stakeholders notified
- [ ] Support team briefed
- [ ] Rollback plan ready

---

## 🚀 Ready to Deploy!

If all items are checked, you're ready to deploy:

```bash
# 1. Final review of OpenAI key in mta.yaml
grep OPENAI_API_KEY mta.yaml

# 2. Build
mbt build

# 3. Deploy
cf deploy mta_archives/commissions_accounting_1.0.0.mtar

# 4. Verify
cf apps
cf app commissions_accounting-ai-service
curl https://your-ai-route/health

# 5. Test in browser
# Open HTML5 app URL and test formula generation
```

**Post-Deployment:** Monitor for 24-48 hours, check logs daily, review OpenAI usage weekly.

**Questions?** Refer to documentation:
- Quick issues: `AI_QUICK_START.md`
- Deployment help: `AI_DEPLOYMENT_GUIDE.md`
- Architecture questions: `ARCHITECTURE.md`
- Technical deep dive: `IMPLEMENTATION_SUMMARY.md`

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Environment:** ☐ Development  ☐ Test  ☐ Production
**Sign-Off:** _______________
