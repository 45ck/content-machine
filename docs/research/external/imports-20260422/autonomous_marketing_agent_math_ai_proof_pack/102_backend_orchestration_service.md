# Backend Orchestration Service

## Service responsibilities

The backend should coordinate agents, tools, approvals, policies, platform APIs, analytics, and learning memory.

## Core services

| Service | Responsibility |
|---|---|
| ProductTruthService | Stores product, feature, claim, proof, limitation data |
| BuyerIntelService | Ingests and structures VOC/research data |
| HypothesisService | Creates angle/offer/channel hypotheses |
| CreativeService | Generates copy, briefs, and asset prompts |
| PolicyService | Validates claims, platform risk, and landing-page consistency |
| ExperimentService | Creates experiments, arms, decision rules |
| PlatformAdapterService | Converts internal campaign specs into platform-specific payloads |
| ApprovalService | Routes decisions to human owners |
| BudgetGuardService | Enforces caps, pacing, kill switches |
| MetricsService | Pulls platform and warehouse metrics |
| LearningService | Writes learning memos and updates priors |

## API endpoints

```text
POST /products
POST /claims
POST /buyer-insights/ingest
POST /hypotheses/generate
POST /assets/generate
POST /policy/review
POST /experiments/create
POST /experiments/{id}/launch
POST /experiments/{id}/pause
GET  /experiments/{id}/metrics
POST /experiments/{id}/learning-memo
```

## Execution graph

```text
Product Brief -> Claim Bank -> Buyer Intel -> Hypotheses -> Creative Drafts -> Policy Gate -> Approval -> Platform Payload -> Launch -> Metrics -> Learning Memo -> Next Hypotheses
```

## Tool permissions

Separate tools into:

- read-only tools,
- draft-only tools,
- review tools,
- write tools,
- destructive tools.

Only deterministic services should execute destructive actions such as pausing campaigns or changing budget.

## Mindset

LLMs reason and draft. Services enforce reality.
