# Guardrail Policy Config

Converted from `123_guardrail_policy_config.yaml` so the pack remains Markdown-only.

```yaml
autonomy_level: L4_bounded
launch:
  auto_launch_allowed: true
  allowed_risk_levels: [low]
  requires_approval_for:
    - medium
    - high
    - competitor_comparison
    - quantified_claim
    - security_privacy_claim
    - pricing_discount
    - testimonial
    - new_offer
budget:
  account_daily_cap: 200
  channel_daily_caps:
    google: 80
    meta: 60
    linkedin: 40
    tiktok: 20
  experiment_cap: 300
  variant_cap: 40
  budget_increase_requires_human: true
claims:
  require_claim_id: true
  block_unapproved_claims: true
  expire_claims_after: claim_expiry_date
  prohibited_terms:
    - guaranteed
    - 100% accurate
    - replaces your team
    - best in the world
    - risk-free
privacy:
  deidentify_customer_text: true
  block_sensitive_personalization: true
  max_personalization_level: segment
platforms:
  google:
    enforce_misrepresentation_scan: true
  meta:
    enforce_personal_attributes_scan: true
  linkedin:
    b2b_targeting_only: true
  tiktok:
    video_claim_review: true
```
