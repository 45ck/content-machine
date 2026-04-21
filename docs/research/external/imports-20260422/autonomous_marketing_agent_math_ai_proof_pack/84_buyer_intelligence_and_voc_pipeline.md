# Buyer Intelligence and Voice-of-Customer Pipeline

## Objective

The ad factory should not guess what buyers care about. It should mine buyer language and convert it into structured hypotheses.

## Input sources

High-signal sources:

- sales-call transcripts,
- demo objections,
- onboarding calls,
- support tickets,
- churn reasons,
- chat logs,
- review sites,
- competitor reviews,
- Reddit/forum discussions,
- search query reports,
- site-search logs,
- trial user events,
- customer-success notes,
- win/loss notes.

## Extraction schema

For every useful fragment, extract:

```json
{
  "quote": "I don't trust tools that need access to my inbox.",
  "source_type": "sales_call",
  "buyer_state": "solution_aware",
  "theme": "privacy_objection",
  "emotion": "risk_aversion",
  "job_to_be_done": "process customer email faster without exposing sensitive data",
  "objection": "data_access",
  "desired_proof": "security docs, permission scopes, data retention policy",
  "possible_angle": "See exactly what permissions are required before connecting Gmail",
  "risk_flags": ["privacy_claim"]
}
```

## Buyer-state taxonomy

| State | What they need | Best ad role |
|---|---|---|
| Unaware | Problem recognition | Name the hidden cost |
| Problem-aware | Category education | Show mechanism and outcome |
| Solution-aware | Differentiation | Compare approaches |
| Vendor-aware | Proof and risk reduction | Demo, review, case study, docs |
| Active buyer | Low-friction action | Trial, sandbox, pricing, calendar |
| Trial user | Activation | Next step, setup help, quick win |
| Stalled buyer | Objection resolution | Security, migration, ROI, internal buy-in |
| Paid user | Expansion | New use case, team workflow, integration |

## Output artifacts

- Buyer language library.
- Objection library.
- Angle library.
- Proof requirements library.
- Persona x state x channel matrix.
- Ads generated from real buyer phrasing.

## Mindset

Do not write ads from the founder's fantasy of the product. Write ads from the buyer's lived friction.
