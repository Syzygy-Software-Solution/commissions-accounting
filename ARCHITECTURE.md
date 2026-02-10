# AI Formula Generation - System Architecture

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         SAP BTP Cloud Foundry                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                         │
        ▼                                                         ▼
┌─────────────────┐                                    ┌──────────────────┐
│   SAPUI5 App    │                                    │   CAP Service    │
│  (Frontend)     │◄───────────────────────────────────│   (Node.js)      │
└────────┬────────┘                                    └────────┬─────────┘
         │                                                      │
         │ XSUAA Auth                                          │ OData V4
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐                                    ┌──────────────────┐
│  Configuration  │                                    │   HANA Cloud     │
│  → Amortization │                                    │    Database      │
│    Calculation  │                                    └──────────────────┘
└────────┬────────┘
         │
         │ Natural Language Prompt
         │ "Calculate monthly deferred payment"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     AI Formula Generator UI Panel                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Prompt Input: [Calculate monthly deferred payment with cap...] │    │
│  │                                                                  │    │
│  │ [Generate Formula ✨]  [Test Formula ▶]  [Clear ✕]            │    │
│  │                                                                  │    │
│  │ Status: ✅ Formula generated successfully                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ HTTP POST /api/generate-formula
         │ { "prompt": "..." }
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Python AI Service (FastAPI)                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Request Handler                                                 │    │
│  │    ├─ Validate prompt                                           │    │
│  │    ├─ Build context with few-shot examples                      │    │
│  │    └─ Call OpenAI API                                           │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ OpenAI API Request
         │ GPT-4o-mini
         │ Temperature: 0.1 (deterministic)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenAI API                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  System Prompt:                                                  │    │
│  │  "You are a specialized formula generation assistant..."        │    │
│  │                                                                  │    │
│  │  Few-Shot Examples:                                             │    │
│  │  - "monthly deferred" → "totalAmount / term"                    │    │
│  │  - "with cap" → "(totalAmount * (capPercent / 100)) / term"     │    │
│  │  - "quarterly" → "(totalAmount / term) * 3"                     │    │
│  │  ... (7 total examples)                                         │    │
│  │                                                                  │    │
│  │  User Prompt: "Calculate monthly deferred payment with cap"     │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ Generated Formula
         │ "(totalAmount * (capPercent / 100)) / term"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Formula Validation Layer                                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Check for forbidden keywords (eval, Function, require...)    │    │
│  │  ✓ Validate variable names (only allowed: totalAmount, etc.)    │    │
│  │  ✓ Check syntax (balanced parentheses)                          │    │
│  │  ✓ Ensure returns numeric value                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ API Response
         │ {
         │   "formula": "(totalAmount * (capPercent / 100)) / term",
         │   "explanation": "Generated formula for: ...",
         │   "isValid": true,
         │   "error": null
         │ }
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Formula Code Panel                                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Language: [JavaScript ▼]                                       │    │
│  │                                                                  │    │
│  │  1  // AI Generated Formula                                     │    │
│  │  2  // Prompt: Calculate monthly deferred payment with cap      │    │
│  │  3                                                               │    │
│  │  4  (totalAmount * (capPercent / 100)) / term                   │    │
│  │                                                                  │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ User clicks [Test Formula ▶]
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Formula Test Engine (JavaScript)                            │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Test Data:                                                      │    │
│  │    totalAmount = 10000                                           │    │
│  │    capPercent = 50                                               │    │
│  │    term = 12                                                     │    │
│  │    amortizationFrequency = "Monthly"                             │    │
│  │    payrollClassification = "W2"                                  │    │
│  │                                                                  │    │
│  │  Evaluation (safe Function constructor):                        │    │
│  │    result = (10000 * (50 / 100)) / 12                           │    │
│  │    result = 5000 / 12                                            │    │
│  │    result = 416.67                                               │    │
│  │                                                                  │    │
│  │  Generate 6-period sample schedule                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ Test Results
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Test Results Panel                                   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Test Scenario: $10,000 | Cap: 50% | Term: 12 months           │    │
│  │  Formula Result: $416.67 per period                             │    │
│  │                                                                  │    │
│  │  Sample Amortization Schedule:                                  │    │
│  │  ┌────────┬────────────┬───────────┬────────────┬───────────┐  │    │
│  │  │ Period │    Date    │  Payment  │ Remaining  │  Status   │  │    │
│  │  ├────────┼────────────┼───────────┼────────────┼───────────┤  │    │
│  │  │   1    │  Jan 2026  │  $416.67  │ $9,583.33  │  Pending  │  │    │
│  │  │   2    │  Feb 2026  │  $416.67  │ $9,166.66  │  Pending  │  │    │
│  │  │   3    │  Mar 2026  │  $416.67  │ $8,749.99  │  Pending  │  │    │
│  │  │   4    │  Apr 2026  │  $416.67  │ $8,333.32  │  Pending  │  │    │
│  │  │   5    │  May 2026  │  $416.67  │ $7,916.65  │  Pending  │  │    │
│  │  │   6    │  Jun 2026  │  $416.67  │ $7,499.98  │  Pending  │  │    │
│  │  │  ...   │    ...     │    ...    │    ...     │ 6 more... │  │    │
│  │  └────────┴────────────┴───────────┴────────────┴───────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
1. User Input
   └─> Natural language prompt entered in UI

2. AI Generation Request
   └─> HTTP POST to Python FastAPI service
       └─> System prompt + Few-shot examples + User prompt
           └─> OpenAI GPT-4o-mini API call
               └─> Formula generated

3. Formula Validation
   └─> Check forbidden keywords
   └─> Validate variable names
   └─> Verify syntax
   └─> Return validated formula

4. Display Formula
   └─> Update code editor with generated formula
   └─> Show status message

5. Test Formula (Optional)
   └─> Evaluate formula with predefined data
   └─> Generate sample amortization schedule
   └─> Display test results table
```

## Component Interaction Matrix

```
┌──────────────────┬────────────┬────────────┬─────────────┬──────────────┐
│   Component      │  UI5 App   │  CAP Srv   │  AI Service │  OpenAI API  │
├──────────────────┼────────────┼────────────┼─────────────┼──────────────┤
│ UI5 App          │     -      │   OData    │    REST     │      -       │
│ CAP Service      │   OData    │     -      │      -      │      -       │
│ AI Service       │   REST     │     -      │      -      │     REST     │
│ OpenAI API       │     -      │     -      │    REST     │      -       │
│ HANA DB          │     -      │   Native   │      -      │      -       │
└──────────────────┴────────────┴────────────┴─────────────┴──────────────┘

Legend:
  OData  - OData V4 protocol
  REST   - RESTful HTTP API
  Native - Native database connection
  -      - No direct interaction
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                   User Authentication (XSUAA)                    │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ All requests require valid XSUAA token                 │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Formula Content Validation                      │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ ✓ Block dangerous keywords (eval, Function, ...)      │      │
│  │ ✓ Whitelist variables (totalAmount, capPercent, ...)  │      │
│  │ ✓ Syntax validation (balanced parentheses)            │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Response Constraint                         │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ System prompt limits AI to formula generation only     │      │
│  │ Off-topic requests rejected with guidance message      │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Safe Formula Evaluation                       │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Function() constructor (safer than eval)               │      │
│  │ Strict mode enabled                                    │      │
│  │ Isolated scope with only required variables            │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       mta.yaml (Single Deployment)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Module 1: commissions_accounting-srv (Node.js)                         │
│    ├─ Buildpack: nodejs_buildpack                                       │
│    ├─ Provides: srv-api                                                 │
│    └─ Requires: XSUAA, HANA DB                                          │
│                                                                           │
│  Module 2: commissions_accounting-db-deployer (HANA)                    │
│    ├─ Type: hdb                                                          │
│    └─ Requires: HANA DB                                                 │
│                                                                           │
│  Module 3: commissionsaccounting (HTML5)                                │
│    ├─ Type: html5                                                        │
│    └─ Build: UI5 build                                                  │
│                                                                           │
│  Module 4: commissions_accounting-ai-service (Python) ⭐ NEW            │
│    ├─ Buildpack: python_buildpack                                       │
│    ├─ Memory: 512M                                                       │
│    ├─ Disk: 1024M                                                        │
│    ├─ Instances: 1 (scalable)                                           │
│    ├─ Provides: ai-service-api                                          │
│    ├─ Requires: XSUAA                                                   │
│    └─ Environment: OPENAI_API_KEY                                       │
│                                                                           │
│  Resources:                                                              │
│    ├─ XSUAA (Authentication)                                            │
│    ├─ HANA Cloud (Database)                                             │
│    ├─ Destination Service                                               │
│    └─ HTML5 App Repository                                              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

Single Command Deployment: cf deploy mta_archives/*.mtar
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ SAPUI5 5.143.2                                         │      │
│  │ ├─ XML Views                                           │      │
│  │ ├─ JSON Models                                         │      │
│  │ ├─ Code Editor Control                                 │      │
│  │ └─ Responsive Design                                   │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Backend Services Layer                     │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ SAP CAP (Node.js)                                      │      │
│  │ ├─ OData V4 Service                                    │      │
│  │ ├─ Entity Framework                                    │      │
│  │ └─ Business Logic                                      │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       AI Service Layer ⭐ NEW                    │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Python 3.11+                                           │      │
│  │ ├─ FastAPI 0.109.0 (Web Framework)                    │      │
│  │ ├─ Uvicorn 0.27.0 (ASGI Server)                       │      │
│  │ ├─ LangChain 0.1.20 (LLM Orchestration) ⭐            │      │
│  │ ├─ LangChain-OpenAI 0.1.1 (OpenAI Integration)       │      │
│  │ ├─ Pydantic 2.6.0 (Data Validation)                   │      │
│  │ └─ CORS Middleware                                     │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Data Layer                              │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ SAP HANA Cloud                                         │      │
│  │ ├─ HDI Container                                       │      │
│  │ ├─ CDS Schema                                          │      │
│  │ └─ Native Queries                                      │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        External Services                         │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ LangChain LLM Providers (Model Agnostic) ⭐          │      │
│  │ ├─ Current: OpenAI GPT-4o-mini                        │      │
│  │ ├─ Alternative: Anthropic Claude                      │      │
│  │ ├─ Alternative: Google Gemini                         │      │
│  │ ├─ Alternative: Azure OpenAI                          │      │
│  │ └─ Parameters:                                         │      │
│  │     • Temperature: 0.1                                 │      │
│  │     • Max Tokens: 500                                  │      │
│  │     • Top P: 0.95                                      │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Cost & Performance Profile

```
┌──────────────────────────────────────────────────────────────────┐
│                    Performance Metrics                            │
├──────────────────────────────────────────────────────────────────┤
│  Formula Generation Latency:     2-3 seconds (avg)              │
│  Test Execution Time:             < 100ms                        │
│  AI Service Memory Usage:         ~200-300MB (base)             │
│  OpenAI API Timeout:              30 seconds                     │
│  Concurrent Requests:             50 (default, scalable)         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Cost Breakdown                                │
├──────────────────────────────────────────────────────────────────┤
│  OpenAI API:                                                      │
│    ├─ Input tokens:   $0.15 / 1M (~$0.0001 per request)         │
│    ├─ Output tokens:  $0.60 / 1M (~$0.0001 per request)         │
│    └─ Total per formula: ~$0.0002                                │
│                                                                   │
│  BTP Cloud Foundry (estimated monthly):                          │
│    ├─ AI Service (512MB): ~$15-20/month                         │
│    ├─ CAP Service:        Existing                              │
│    ├─ HANA Cloud:         Existing                              │
│    └─ Total incremental:  ~$15-20/month + OpenAI usage          │
│                                                                   │
│  Usage Examples:                                                  │
│    ├─ 1,000 formulas/day:   $6/month OpenAI                     │
│    ├─ 10,000 formulas/day:  $60/month OpenAI                    │
│    └─ 100,000 formulas/day: $600/month OpenAI                   │
└──────────────────────────────────────────────────────────────────┘
```

---

**Architecture Notes:**
- No vector database → Lightweight in-memory few-shot examples
- No LangSmith → No monitoring overhead
- No conversation history → Stateless, scalable design
- Deterministic output → Low temperature for consistency
- Safe evaluation → Multiple validation layers
- Single deployment → One MTA archive for everything
