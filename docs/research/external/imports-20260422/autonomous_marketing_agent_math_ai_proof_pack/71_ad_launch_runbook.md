# Autonomous Ad Launch Runbook

## Pre-launch

### 1. Confirm strategy

- Campaign ID exists.
- Hypothesis ID exists.
- Buyer state identified.
- Offer selected.
- Landing page selected.
- Primary metric selected.
- Kill/scale rules selected.

### 2. Confirm claims

- Every claim maps to approved claim ID.
- Claims are current.
- High-risk claims have approval.
- No invented facts.
- No invented customers/logos/testimonials.

### 3. Confirm creative

- Platform-specific copy generated.
- Creative critic score above threshold.
- Ad promise matches landing page.
- Visual/video brief does not imply false proof.
- AI-generated people/voices handled with disclosure and rights review where applicable.

### 4. Confirm policy

- Platform policy checklist passed.
- Privacy/targeting checklist passed.
- Special category check passed.
- Brand safety check passed.

### 5. Confirm measurement

- Final URL works.
- UTMs present.
- Conversion event tested.
- Analytics sees test event.
- CRM/product analytics receives lead/signup.

### 6. Confirm budget

- Daily cap set.
- Total cap set.
- Account/platform cap not exceeded.
- Auto-pause thresholds configured.

## Launch

### L3 launch

1. Generate platform payload.
2. Render human-readable preview.
3. Store payload and preview.
4. Human approves.
5. API Launch Agent publishes.
6. Read back platform object.
7. Verify live object equals approved payload.
8. Start Monitor Agent.

### L4 bounded autonomous launch

1. Verify campaign family is L4-approved.
2. Verify claims/audience/budget are inside approved boundaries.
3. Run policy gate.
4. Launch automatically.
5. Notify human with launch summary.
6. Monitor aggressively for first 24 hours.

## First-hour checks

- Campaign status active.
- No policy rejection.
- Spend is within expected velocity.
- Landing page works.
- UTMs flowing.
- Events tracking.
- No unusual traffic pattern.

## First-day checks

- Spend vs cap.
- CTR vs baseline.
- CPC/CPM vs expected.
- Conversion tracking.
- Lead quality if available.
- Comments/reactions for social.
- Search terms for search.
- Placement quality for display/social.

## Auto-pause rules

Pause immediately if:

- final URL broken,
- conversion tracking broken,
- spend spike beyond threshold,
- policy warning/disapproval,
- unsupported claim detected,
- wrong landing page served,
- suspicious/bot traffic spike,
- serious negative comments or complaints,
- budget cap breached.

## Human escalation template

```text
Escalation: {{risk_type}}
Campaign: {{campaign_id}}
Ad/variant: {{variant_id}}
Platform: {{platform}}
Issue detected: {{issue}}
Evidence: {{evidence}}
Current action: paused | reduced budget | no action
Recommended decision: approve fix | keep paused | escalate legal | update claim ledger
Deadline: {{deadline}}
```

## Post-launch learning memo

```text
Campaign:
Hypothesis:
Buyer state:
Spend:
Primary result:
Secondary result:
Guardrails:
What worked:
What failed:
What is inconclusive:
Claim/angle learning:
Landing page learning:
Next test:
Autonomy issues:
```

## Runbook mindset

> Launch is not the end of creation. It is the start of evidence collection.
