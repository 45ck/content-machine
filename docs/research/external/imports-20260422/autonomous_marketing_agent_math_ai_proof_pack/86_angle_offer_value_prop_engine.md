# Angle, Offer, and Value Proposition Engine

## Definitions

- **Angle**: The interpretation of the buyer's problem.
- **Offer**: The low-risk next step or commercial proposition.
- **Value proposition**: The reason this product is worth attention now.

## Angle families

| Angle | Use when | Example |
|---|---|---|
| Pain removal | Buyer has obvious friction | “Stop copying support emails into Jira.” |
| Outcome creation | Buyer wants upside | “Turn product feedback into a ranked roadmap.” |
| Risk reduction | Buyer fears harm | “Review every AI draft before it touches a customer.” |
| Speed | Time-to-value is strong | “Set up your first workflow in 12 minutes.” |
| Control | Buyers distrust automation | “Choose exactly which inboxes and fields AI can access.” |
| Comparison | Category is crowded | “Purpose-built for support handoffs, not generic automation.” |
| Hidden cost | Buyer underestimates pain | “Your engineers are triaging support noise instead of building.” |
| Identity/status | Buyer wants competence | “Run support ops like a product team.” |
| Proof | Buyer is skeptical | “Watch one messy ticket become a clean Linear issue.” |

## Offer types

| Offer | Best for | Weakness |
|---|---|---|
| Free trial | Product-led SaaS with fast activation | Can attract low-intent users |
| Sandbox demo | Skeptical technical buyers | Requires strong demo data |
| Interactive calculator | ROI-driven B2B | Can be gamed or distrusted |
| Template download | Early-stage problem-aware buyer | Low buying intent |
| Migration audit | Complex switching product | Requires service capacity |
| Security/permissions preview | Privacy-sensitive software | May slow emotional conversion |
| Live demo | Enterprise or complex product | Sales friction |
| Free diagnostic | Consultative product | Harder to automate |
| One-click workflow test | Utility tools | Needs polished product path |

## Generation prompt structure

Ask the agent for a structured output:

```json
{
  "buyer_state": "solution_aware",
  "job_to_be_done": "convert support chaos into developer-ready tickets",
  "primary_objection": "AI may be inaccurate",
  "angle": "AI drafts; humans approve",
  "offer": "try a sandbox ticket conversion",
  "proof_needed": ["demo", "field-level output", "limitations"],
  "ad_claim_ids": ["CLM-001", "CLM-004"],
  "landing_page_modules": ["demo", "permissions", "accuracy caveat", "trial CTA"]
}
```

## Decision rule

For cold traffic, prefer low-belief offers: demos, templates, checklists, calculators, examples.

For high-intent traffic, prefer direct offers: trial, pricing, demo, comparison, migration.

For skeptical technical buyers, prefer verifiable transformations over broad promises.
