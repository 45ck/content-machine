# Sample Product Brief

Converted from `reference_implementation/data/sample_product_brief.yml` so the pack remains Markdown-only.

```yaml
product:
  id: sflow
  name: SupportFlow AI
  category: B2B SaaS support operations
  primary_job: Convert messy support requests into structured developer-ready ticket drafts.
  icp:
    - B2B SaaS support teams
    - Support managers
    - Product operations teams
    - Engineering teams receiving escalated bugs
  pricing_model: per-seat monthly subscription
  primary_conversion_event: activated_trial
  activation_event: first_ticket_draft_created
  unsupported_use_cases:
    - autonomous customer support decisions without review
    - regulated medical/legal advice
  required_disclaimers:
    - AI-generated drafts should be reviewed before use.
features:
  - id: feature_ticket_drafts
    name: Ticket draft generation
    outcome: Create structured ticket drafts from inbound support emails.
    limitations:
      - Accuracy depends on email clarity.
      - Human review recommended.
    proof_url: https://example.com/demo/ticket-drafts
  - id: feature_permission_preview
    name: Permission preview
    outcome: Show required inbox permissions before connection.
    limitations:
      - Availability depends on email provider.
    proof_url: https://example.com/security/permissions
brand_voice:
  tone: specific, calm, technical, no hype
  avoid:
    - revolutionary
    - 10x
    - guaranteed
    - replace your team
approved_offers:
  - watch_demo
  - try_sandbox_with_sample_data
  - view_permission_preview
  - book_technical_demo
```
