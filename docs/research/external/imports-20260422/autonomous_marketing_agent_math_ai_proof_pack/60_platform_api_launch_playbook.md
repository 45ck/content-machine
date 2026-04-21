# Platform API Launch Playbook

## Purpose

This file maps autonomous ad generation to real ad-platform mechanics. APIs make scale possible, but they also make mistakes expensive. Treat every API write as a high-impact action.

## Google Ads

### What can be automated

- Campaign budgets.
- Search campaigns.
- Ad groups.
- Keywords and negative keywords.
- Responsive search ads.
- Asset creation and management.
- Reporting.
- AI Max/Search settings where supported.

### Important mechanics

Responsive Search Ads require at least:

- 3 headlines,
- 2 descriptions,
- 1 final URL.

AI Max for Search campaigns is an optimization layer, not a separate campaign type. It can expand reach, tailor creative, and optimize landing pages. Its text customization setting evolved from automatically created assets.

### Guardrails

- Every final URL must match the ad promise.
- Do not let final URL expansion send users to pages that contradict the campaign offer.
- Use campaign/ad group naming conventions with hypothesis IDs.
- Use daily budget caps and campaign end dates during tests.
- Keep disapproved-ad logs.
- Do not rely on platform automation to solve weak strategy.

### Best use cases

- High-intent search.
- Competitor alternatives.
- Integration queries.
- Problem-aware searches.
- Retargeting to proof pages.

## Meta Ads

### What can be automated

- Campaign creation through the Marketing API.
- Ad sets.
- Ad creatives.
- Ads.
- Image/video uploads.
- Reporting through Insights.
- Advantage+ creative variations.

### Important mechanics

Meta's Marketing API uses campaign, ad set, ad creative, and ad objects. Advantage+ creative uses AI to generate and enhance variations across formats.

### Guardrails

- Avoid personal-attribute assertions.
- Avoid implying sensitive traits.
- Avoid misleading before/after or unrealistic outcomes.
- Be careful with AI-generated people, voices, or simulated endorsements.
- Use comments/feedback monitoring because social ads create public reactions.
- Strongly gate health, finance, employment, housing, political, and other restricted categories.

### Best use cases

- Problem creation and education.
- Founder/product-led demos.
- Visual workflow demonstration.
- Retargeting based on site/product engagement.
- Creative fatigue refresh.

## LinkedIn Ads

### What can be automated

- Campaign creation and management through LinkedIn Marketing APIs.
- Campaign groups.
- Creatives.
- Professional targeting.
- Reporting.
- Lead-gen forms.

### Important mechanics

LinkedIn APIs support scalable campaign and creative management. The platform is useful for B2B targeting, but professional context raises expectations for clarity and substantiation.

### Guardrails

- Avoid unverifiable business-result claims.
- Avoid deceptive job, income, or professional-outcome promises.
- Use precise B2B proof.
- Strongly prefer case studies, demos, reports, guides, and comparison pages over clickbait.

### Best use cases

- B2B SaaS.
- Enterprise proof.
- Founder-led category education.
- Lead magnets.
- Role-specific pain points.

## TikTok Ads

### What can be automated

- Campaign and ad management at scale through API for Business.
- Creative material management.
- Reporting.
- Batch delivery.

### Important mechanics

TikTok emphasizes high-volume creative and native formats. The API is built for creating and managing campaigns, ad groups, ads, creative materials, and reporting at scale.

### Guardrails

- Make AI-generated or altered content transparent where required.
- Avoid fake UGC or fake testimonials.
- Avoid exploiting insecurity or creating deceptive native-looking content.
- Be especially careful with young audiences and sensitive categories.

### Best use cases

- Short demo hooks.
- Founder/product education.
- Lightweight consumer apps.
- Fast creative iteration.
- Top-of-funnel awareness.

## Microsoft Advertising

### What can be automated

- Campaigns.
- Ad groups.
- Responsive search ads.
- Budgets.
- Reporting.
- Audience and multimedia ads.

### Important mechanics

Responsive search ads allow multiple headlines and descriptions, and Microsoft selects combinations based on query and intent signals.

### Guardrails

- Same as Google Search: match query intent, control claims, control landing pages, watch search terms.

### Best use cases

- B2B search.
- Older/professional search audiences.
- Complementing Google Search.
- Competitor/category search with lower CPC in some markets.

## Cross-platform payload schema

Use an internal normalized schema before converting to platform-specific payloads.

```json
{
  "campaign_id": "CMP-2026-001",
  "hypothesis_id": "HYP-014",
  "platform": "google_ads",
  "buyer_state": "solution_aware",
  "audience": {
    "name": "developers_searching_for_linear_jira_automation",
    "allowed": true,
    "risk_class": "low"
  },
  "offer": {
    "type": "interactive_demo",
    "url": "https://example.com/demo/support-ticket-to-issue"
  },
  "claims": ["CLM-002", "CLM-009"],
  "creative": {
    "headlines": [],
    "descriptions": [],
    "primary_text": [],
    "cta": "Try demo"
  },
  "budget": {
    "daily_cap": 50,
    "currency": "AUD",
    "max_test_spend": 500
  },
  "tracking": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "CMP-2026-001",
    "primary_conversion": "activated_demo"
  },
  "approvals": {
    "claim_gate": "passed",
    "policy_gate": "passed",
    "human_launch_approval_required": true
  }
}
```

## API launch rules

1. Never let an LLM directly call an ad API without structured validation.
2. Use dry-run mode first.
3. Validate all final URLs.
4. Validate budgets and dates.
5. Validate all claim IDs.
6. Validate platform-specific policy checks.
7. Validate UTM uniqueness.
8. Store payload, preview, and approval record before launch.
9. After launch, verify the live platform object matches the approved payload.
10. Auto-pause if tracking fails.

## Platform automation mindset

Platform AI can optimize delivery, combinations, targeting, and placement. It does not know your ethics, product truth, margin, customer quality, long-term brand risk, or strategic positioning unless you constrain it.

Your system should give platforms:

- strong creative inputs,
- clean conversion events,
- high-quality landing pages,
- accurate budgets,
- clear exclusions,
- enough data to learn.

Your system should not give platforms:

- vague offers,
- poor conversion events,
- unsupported claims,
- misleading pages,
- unrestricted budgets,
- permission to chase low-quality conversions.
