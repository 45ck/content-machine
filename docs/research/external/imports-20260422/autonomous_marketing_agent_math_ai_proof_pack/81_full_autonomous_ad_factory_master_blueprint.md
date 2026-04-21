# Full Autonomous Ad Factory — Master Blueprint

## Core conclusion

Yes: a bounded autonomous system can research, propose, generate, validate, launch, monitor, pause, iterate, and report on ads for software/digital products. The real obstacle is not ad generation. The obstacle is building an operating system that prevents the agent from inventing unsupported claims, wasting budget, violating platform policies, or optimising for fake metrics.

The correct target is not “AI makes ads.” The correct target is:

> Convert product truth into buyer-specific proof paths, launch controlled experiments, learn from causal evidence, and keep spend inside hard safety limits.

## The production loop

1. **Input truth**: product brief, positioning, offers, pricing, proof, support logs, reviews, sales calls, docs, integration list, security posture, case studies.
2. **Extract buyer states**: unaware, problem-aware, solution-aware, vendor-aware, active comparer, trial user, stalled buyer, expansion candidate.
3. **Generate hypotheses**: pain, outcome, mechanism, proof, objection, urgency, offer, demo path.
4. **Create assets**: copy, static creative briefs, image prompts, video storyboards, landing page sections, email/retargeting copy, AI-search snippets.
5. **Validate claims**: every claim must map to a claim ID, evidence record, expiry date, allowed wording, and risk class.
6. **Route channels**: search for active demand, social/video for problem creation and narrative, LinkedIn for B2B targeting, retargeting for proof and risk reduction, product-led paths for trials.
7. **Create platform payloads**: draft campaign/ad/ad-set/ad-group/asset objects with naming conventions and UTM conventions.
8. **Human gate by risk**: low-risk variants may auto-launch; medium/high-risk claims require approval.
9. **Launch within budget envelope**: pre-set budget caps, kill rules, pacing rules, exclusions, and holdouts.
10. **Measure**: platform metrics, warehouse metrics, CRM events, product activation, incrementality where possible.
11. **Learn**: store results as hypotheses, not folklore. A winning ad means a specific buyer-state/message/channel/offer combination won under specific conditions.
12. **Refresh**: generate new variants from the learning memory, not random novelty.

## Minimum viable autonomous factory

Build the first version around five hard subsystems:

- **Claim Bank**: what the system is allowed to say.
- **Creative Generator**: what the system proposes.
- **Policy Gate**: what the system blocks or escalates.
- **Experiment Runner**: what the system tests and how it decides.
- **Learning Memory**: what the system remembers and reuses.

Everything else is an extension.

## What full autonomy actually means

| Level | Name | System can do | Human role | Use now? |
|---|---|---|---|---|
| L0 | Manual | Nothing automated | All work | Baseline only |
| L1 | Drafting | Generate copy/ideas | Review and publish | Yes |
| L2 | Structured production | Generate structured campaign plans and payload drafts | Approve launch | Yes |
| L3 | Semi-autonomous ops | Launch pre-approved low-risk tests, monitor, pause | Approve claims/offers/budgets | Yes |
| L4 | Bounded autonomy | Launch/refresh/optimise inside approved claims, audiences, offers, caps | Review exceptions and strategy | Target state |
| L5 | Unbounded autonomy | Invent claims/offers, expand audiences, change budgets, publish freely | After-the-fact review | Avoid |

## One sentence rule

**Autonomy is acceptable only where the downside is bounded and the truth source is controlled.**

## Build order

Do not begin with platform APIs. Begin with the information architecture.

1. Product truth model.
2. Claim/proof ledger.
3. Buyer-state taxonomy.
4. Creative hypothesis schema.
5. Compliance and policy gate.
6. Experiment decision rules.
7. Mock platform adapters.
8. Real platform adapters.
9. Budget guardrails.
10. Learning memory.

## Sources to study

- OpenAI Agents SDK: https://developers.openai.com/api/docs/guides/agents
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Google Ads API AI Max for Search: https://developers.google.com/google-ads/api/docs/campaigns/ai-max-for-search-campaigns/getting-started
- Google Ads API Experiments: https://developers.google.com/google-ads/api/docs/experiments/overview
- ACCC false or misleading claims: https://www.accc.gov.au/consumers/advertising-and-promotions/false-or-misleading-claims
