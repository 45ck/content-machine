# Autonomous Ad System Architecture

## Objective

Build an automated system that can move from product facts to ads, landing pages, launch payloads, measurement, and iteration without losing control over truth, spend, compliance, or brand.

## High-level architecture

```text
Inputs
  ├─ Product fact bank
  ├─ Claim ledger
  ├─ Customer research corpus
  ├─ Competitor/ad library corpus
  ├─ Brand voice guide
  ├─ Offer library
  ├─ Audience and exclusion rules
  ├─ Platform policy rules
  ├─ Budget/risk limits
  ├─ Analytics/conversion events
  └─ Landing page/product proof assets

Agent layer
  ├─ Research Agent
  ├─ Buyer-State Agent
  ├─ Strategy/Hypothesis Agent
  ├─ Copy Agent
  ├─ Visual/Video Brief Agent
  ├─ Landing Page Agent
  ├─ Compliance & Claim Agent
  ├─ Experiment Design Agent
  ├─ Launch/API Agent
  ├─ Measurement Agent
  ├─ Optimization Agent
  └─ Learning Memory Agent

Gates
  ├─ Fact verification
  ├─ Claim approval
  ├─ Platform policy screen
  ├─ Privacy screen
  ├─ Brand screen
  ├─ Budget cap
  ├─ Human approval for high-impact actions
  └─ Rollback/pause automation

Outputs
  ├─ Campaign briefs
  ├─ Ads and asset variants
  ├─ Landing page variants
  ├─ API-ready campaign payloads
  ├─ Experiment plans
  ├─ Dashboards
  ├─ Learning reports
  └─ Updated playbooks
```

## Agent responsibilities

### 1. Research Agent

Collects and normalizes:

- customer reviews,
- support tickets,
- sales-call objections,
- competitor positioning,
- search terms,
- organic queries,
- product documentation,
- feature release notes,
- pricing and packaging details.

Output:

```json
{
  "problems": [],
  "desired_outcomes": [],
  "objections": [],
  "phrases_customers_use": [],
  "competitor_claims": [],
  "proof_assets_available": [],
  "unsupported_claims_to_avoid": []
}
```

Mindset: discover language and proof gaps, not just hooks.

### 2. Buyer-State Agent

Classifies who the campaign is for:

- unaware,
- problem-aware,
- solution-aware,
- vendor-aware,
- active evaluator,
- trial user,
- paid expansion candidate,
- churn-risk customer.

Output:

```json
{
  "buyer_state": "problem_aware",
  "dominant_tension": "manual reporting is wasting engineering time",
  "belief_gap": "they do not yet believe a lightweight tool can replace internal scripts",
  "risk_gap": "setup and data-security concerns",
  "best_next_step": "interactive demo"
}
```

Mindset: never write an ad until you know which belief it is meant to move.

### 3. Strategy/Hypothesis Agent

Turns research into testable hypotheses:

```json
{
  "hypothesis": "Developers will click more when the ad shows the exact input/output workflow rather than abstract productivity language.",
  "buyer_state": "solution_aware",
  "angle": "workflow transformation",
  "claim_ids": ["CLM-014", "CLM-022"],
  "proof_path": "demo page with sample GitHub issue conversion",
  "success_metric": "qualified activation rate",
  "kill_condition": "spend > 3x target CAC with no activation"
}
```

Mindset: an ad is an experiment, not a finished argument.

### 4. Creative Agents

Generate platform-specific variants:

- Google responsive search headlines/descriptions.
- Meta primary text, headline, description, creative brief.
- LinkedIn thought-leadership or lead-gen copy.
- TikTok/Reels short-form hooks and scripts.
- Landing page hero, proof blocks, FAQ, CTA.

Mindset: generate many precise hypotheses, not many random variants.

### 5. Compliance & Claim Agent

Checks:

- every claim maps to a claim ledger ID,
- no unsupported numerical claim appears,
- no fake testimonial or invented customer appears,
- no platform-restricted targeting or wording appears,
- no misleading omission exists,
- no personal-attribute assertion is used,
- no AI-generated actor implies a real user endorsement,
- required disclosures are present.

Mindset: compliance is not a brake; it is the boundary that lets autonomy scale safely.

### 6. Experiment Design Agent

Selects the right testing method:

- A/B test for clean causal comparison.
- Multi-armed bandit for exploitation during live traffic.
- Geo or holdout test for incrementality.
- Pre/post only when low stakes and clearly marked weak.
- Platform auto-optimization when the platform has enough conversion volume.

Mindset: optimize learning quality before optimizing spend.

### 7. Launch/API Agent

Builds payloads for platform APIs and validates them before execution.

Examples:

- Google Search campaign: budget, campaign, ad group, keywords, responsive search ad.
- Meta campaign: campaign, ad set, creative, ad.
- LinkedIn campaign: campaign group, campaign, creative.
- Microsoft Ads responsive search ad.

Mindset: APIs create scale; guardrails decide whether scale is useful or dangerous.

### 8. Measurement Agent

Monitors:

- spend,
- impressions,
- clicks,
- CTR,
- CPC,
- CPM,
- conversion rate,
- cost per lead,
- activation rate,
- qualified pipeline,
- CAC,
- payback,
- retention signal,
- policy rejection rate,
- complaint rate,
- creative fatigue.

Mindset: the ad is not successful until the buyer becomes more qualified, activated, retained, or profitable.

### 9. Optimization Agent

Allowed actions under L4 autonomy:

- pause an ad that breaches spend/quality limits,
- reduce budget within approved limits,
- increase budget within approved caps,
- refresh creative from approved claim library,
- rotate landing page variant,
- add negative keywords from irrelevant search terms,
- notify human when policy rejection or claim issue appears.

Forbidden without approval:

- new product claims,
- new regulated audiences,
- new sensitive targeting,
- new endorsements,
- major budget increase,
- pricing/offer changes,
- competitor attack ads.

## Memory objects

The system should not just run ads. It should accumulate strategic memory.

### Claim ledger

Every claim must have:

- claim ID,
- exact wording,
- evidence source,
- approved variants,
- owner,
- expiry/review date,
- allowed channels,
- forbidden contexts.

### Angle library

Every angle should store:

- buyer state,
- problem,
- promise,
- proof path,
- target segment,
- previous performance,
- fatigue status.

### Experiment ledger

Every test should store:

- hypothesis,
- variants,
- sample/traffic assumptions,
- metric hierarchy,
- guardrails,
- decision,
- learning.

### Policy incidents

Track:

- platform,
- ad ID,
- disapproval reason,
- wording/asset involved,
- fix,
- recurrence prevention.

## Recommended autonomy setting

For a serious software business:

- Start at L2 for 2-4 weeks.
- Move to L3 once the claim ledger and policy screen work.
- Move selected low-risk campaigns to L4.
- Do not run L5.

## System prompt principles for ad agents

1. Use only approved facts unless explicitly in research mode.
2. Map every performance claim to a claim ID.
3. Treat user reviews and testimonials as quoted evidence, not editable fiction.
4. Prefer concrete demonstrations over vague superiority claims.
5. Avoid personal-attribute assertions.
6. Never invent awards, customer logos, case studies, ratings, integrations, or scarcity.
7. Produce structured outputs so downstream systems can validate them.
8. Escalate uncertainty instead of filling gaps with plausible claims.
