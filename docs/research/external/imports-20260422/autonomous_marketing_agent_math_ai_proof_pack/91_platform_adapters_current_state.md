# Platform Adapters — Current State and Practical Implications

## Google Ads

Useful automation surfaces:

- Search campaigns.
- Responsive Search Ads.
- AI Max for Search campaigns.
- Performance Max.
- Demand Gen.
- Campaign experiments.
- Conversion lift, where available.
- Recommendations and reporting.

Important current direction:

- AI Max for Search campaigns is an optimisation layer for existing Search campaigns, not a separate campaign type.
- It expands reach through search term matching, asset optimisation, URL expansion, improved reporting, and controls such as brand settings, URL inclusions/exclusions, and text guidelines.
- Responsive Search Ads require at least three headlines, two descriptions, and one final URL.
- Demand Gen spans YouTube, Discover and Gmail and uses Google AI while allowing advertisers to control which assets are added.

Sources:

- https://developers.google.com/google-ads/api/docs/campaigns/ai-max-for-search-campaigns/getting-started
- https://developers.google.com/google-ads/api/docs/responsive-search-ads/create-responsive-search-ads
- https://developers.google.com/google-ads/api/docs/demand-gen/overview

## Meta

Useful automation surfaces:

- Campaigns.
- Ad sets.
- Ads.
- Creatives.
- Lift studies.
- Conversion API.
- Reporting.

Use cases:

- High-volume creative testing.
- Interest/lookalike/broad audience experimentation.
- Retargeting proof sequences.
- Lead forms and product-led trial paths.

Source:

- https://developers.facebook.com/docs/marketing-api/
- https://developers.facebook.com/docs/marketing-api/guides/lift-studies/

## TikTok

Useful automation surfaces:

- Batch delivery.
- Campaign/ad-group/ad creation at scale.
- Creative material management.
- Automated bidding decisions.
- Campaign notifications and optimisations.
- Custom audience updates.
- Split Test API.

Source:

- https://ads.tiktok.com/help/article/marketing-api?lang=en

## LinkedIn

Useful automation surfaces:

- Campaign creation and management.
- Creatives.
- B2B audience targeting.
- Sponsored Content.
- Lead forms.
- Ad analytics.

Use LinkedIn when role, company, industry, and professional context are central to the buying process.

Sources:

- https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-04
- https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-creatives?view=li-lms-2026-03

## Universal adapter contract

Every adapter should expose the same internal operations:

```python
validate_payload(payload) -> ValidationResult
create_draft(payload) -> DraftResult
launch(payload, budget_cap, approval_token) -> LaunchResult
pause(platform_ids, reason) -> PauseResult
fetch_metrics(platform_ids, date_range) -> MetricsResult
```

## Mindset

Do not let platform automation become strategy. Use platform automation to execute controlled hypotheses faster.
