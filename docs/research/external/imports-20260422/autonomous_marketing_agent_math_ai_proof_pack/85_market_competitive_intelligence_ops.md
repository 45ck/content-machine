# Market and Competitive Intelligence Operations

## Purpose

A serious ad agent should know the category, alternatives, current claims, positioning patterns, review language, and competitor weaknesses before it generates ads.

## Research inputs

- Competitor websites.
- Pricing pages.
- Comparison pages.
- Changelogs.
- Documentation.
- Public roadmaps.
- Review sites.
- Social posts.
- Ad libraries.
- Search results.
- AI answer engines.
- Communities.

## What to extract

| Object | Question |
|---|---|
| Category promise | What outcome does the category sell? |
| Dominant claims | What claims are repeated by competitors? |
| Weak claims | What claims sound unsupported or vague? |
| Differentiators | Where can we be meaningfully different? |
| Objections | What do buyers complain about? |
| Proof gaps | What do competitors fail to prove? |
| Pricing anchors | What price models shape buyer expectations? |
| Language patterns | What phrases buyers and sellers use repeatedly? |

## Competitive angle types

1. **Against manual work**: “Stop doing X manually.”
2. **Against spreadsheets**: “Replace brittle spreadsheet workflows.”
3. **Against bloated enterprise tools**: “Use only the workflow you need.”
4. **Against generic AI**: “Purpose-built for this job, not a blank chat box.”
5. **Against hidden costs**: “Transparent pricing and exportable data.”
6. **Against risky automation**: “AI drafts; humans approve.”
7. **Against slow implementation**: “Go live in one afternoon.”

## Compliance warning

Competitor comparisons are higher-risk. The agent must:

- avoid unverifiable superiority claims,
- cite comparison basis,
- distinguish fact from opinion,
- update claims frequently,
- avoid trademark misuse,
- route through review.

## Output

The ad agent should produce a competitive memo before producing campaigns:

```json
{
  "category": "AI support-ticket automation",
  "competitors": ["Zendesk AI", "Intercom", "Freshdesk"],
  "repeated_claims": ["reduce response time", "automate support", "AI copilot"],
  "unmet_needs": ["permission transparency", "developer handoff quality", "ticket field accuracy"],
  "safe_angles": ["structured ticket drafts", "human-in-the-loop review", "permission preview"],
  "blocked_angles": ["replaces support team", "more accurate than Zendesk"]
}
```
