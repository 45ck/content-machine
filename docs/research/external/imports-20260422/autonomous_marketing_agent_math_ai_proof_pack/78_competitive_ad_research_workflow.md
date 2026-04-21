# Competitive Ad Research Workflow

## Purpose

Use competitor research to understand market language, proof standards, offers, and positioning gaps. Do not use it to clone ads blindly.

## Inputs

- Google search results and ads for category terms.
- Meta Ad Library.
- TikTok Creative Center / commercial content sources where available.
- LinkedIn ads and company pages.
- Competitor landing pages.
- Review sites.
- Reddit/forum/community discussions.
- Search term reports from your own campaigns.

## Extraction schema

```json
{
  "competitor": "",
  "source": "",
  "ad_or_page_url": "",
  "buyer_state_targeted": "",
  "angle": "",
  "promise": "",
  "proof": "",
  "offer": "",
  "cta": "",
  "risk_or_objection_addressed": "",
  "claims_that_need_substantiation": [],
  "language_to_learn_from": [],
  "language_to_avoid": [],
  "positioning_gap": ""
}
```

## Analysis questions

1. What buyer state are competitors targeting?
2. Are they selling pain relief, status, speed, safety, price, or integration?
3. What proof do they use?
4. What claims are vague or unsupported?
5. What objections do they ignore?
6. What segments are underserved?
7. Which landing pages create the strongest inspection path?
8. Which offers are common: demo, trial, calculator, guide, audit, webinar, template?
9. Which language appears repeatedly across competitors?
10. Which claims would be dangerous to copy?

## Output: positioning gap memo

```text
Market pattern:
Most competitors say: {{pattern}}
They prove it with: {{proof_type}}
They ignore: {{gap}}
Our substantiated difference: {{difference}}
Best buyer state to target: {{buyer_state}}
Best first proof path: {{proof_path}}
Claims we can safely make: {{claims}}
Claims we must avoid: {{blocked_claims}}
```

## Autonomous use

The Research Agent may ingest competitor ads and pages, but the Creative Agent must not copy wording closely. It should extract patterns and create original claims from your own product fact bank.

## Red lines

- Do not imply competitor endorsement.
- Do not make unsubstantiated superiority claims.
- Do not use competitor trademarks in ways that violate platform/legal rules.
- Do not copy images, layouts, or protected creative.
- Do not invent comparisons.

## Mindset

> Competitor research tells you what the market is already trained to notice. Your product truth decides what you are allowed to say.
