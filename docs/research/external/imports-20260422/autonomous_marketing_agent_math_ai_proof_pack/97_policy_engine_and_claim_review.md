# Policy Engine and Claim Review

## Objective

The policy engine is the governor. It blocks unsupported claims, risky targeting, deceptive wording, dark patterns, and platform-policy conflicts.

## Policy layers

1. **Legal/regulator**: consumer law, privacy, spam, unfair/deceptive practices.
2. **Platform**: Google, Meta, LinkedIn, TikTok, Microsoft, app stores, email providers.
3. **Brand**: tone, logo, visual identity, acceptable proof.
4. **Product truth**: features, limitations, pricing, availability.
5. **Ethics**: no coercion, no fake scarcity, no hidden terms, no fake endorsements.

## Claim categories requiring review

- quantified savings,
- guarantees,
- “best”, “#1”, “most accurate”, “enterprise-grade”,
- security/privacy claims,
- AI capability claims,
- competitor comparisons,
- legal/financial/health outcomes,
- testimonials and reviews,
- discounts, limited time, scarcity,
- claims about integrations/certifications.

## Automated checks

The engine should check:

- all claims map to approved claim IDs,
- no prohibited terms,
- no unsupported numbers,
- landing page contains matching proof,
- disclaimers are included where required,
- URL is approved,
- image/video does not imply unsupported outcome,
- audience does not violate special-category restrictions,
- price/offer is current,
- product availability is current.

## Policy output schema

```json
{
  "status": "approved|needs_review|blocked",
  "risk_score": 38,
  "claim_ids_detected": ["CLM-001"],
  "unsupported_claims": [],
  "required_disclaimers": ["Accuracy depends on input quality."],
  "platform_risks": ["Google: misleading representation if demo page lacks proof"],
  "review_route": "marketing_ops",
  "safe_rewrite": "Convert support emails into structured ticket drafts your team can review."
}
```

## Sources

- Google misrepresentation policy: https://support.google.com/adspolicy/answer/6020955?hl=en
- Meta Advertising Standards: https://transparency.meta.com/policies/ad-standards/
- ACCC false or misleading claims: https://www.accc.gov.au/consumers/advertising-and-promotions/false-or-misleading-claims
- FTC AI hub: https://www.ftc.gov/industry/technology/artificial-intelligence

## Mindset

Compliance is not a bureaucratic afterthought. It is what lets you scale without poisoning trust.
