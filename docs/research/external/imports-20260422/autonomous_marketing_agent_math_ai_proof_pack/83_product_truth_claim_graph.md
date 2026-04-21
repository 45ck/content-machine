# Product Truth and Claim Graph

## Why this matters

Autonomous ad generation fails when it starts from vibes. It succeeds when it starts from controlled product truth.

The claim graph is the difference between:

- “Generate 100 high-converting ads”
- “Generate 100 compliant variants using only approved claims, attached proof, and buyer-state logic.”

## Entities

### Product

Fields:

- product name,
- category,
- core job-to-be-done,
- ICP,
- price model,
- primary conversion event,
- activation event,
- unsupported audiences,
- unsupported use cases,
- required disclaimers.

### Feature

Fields:

- feature name,
- user-visible outcome,
- setup requirements,
- limitations,
- evidence link,
- release status,
- owner.

### Claim

Fields:

- claim ID,
- raw claim,
- approved wording,
- prohibited wording,
- risk class,
- proof type,
- source URL/document,
- expiry date,
- required disclaimer,
- jurisdiction,
- approver.

### Proof

Proof types:

- demo,
- screenshot,
- customer quote,
- case study,
- benchmark,
- internal analytics,
- external review,
- certification,
- security document,
- integration documentation,
- pricing page,
- product docs.

### Limitation

Limitations are not optional. They make claims credible and reduce compliance risk.

Examples:

- “Works only with Gmail and Outlook.”
- “Requires admin permissions.”
- “Not intended for regulated medical decisions.”
- “Beta feature.”
- “Savings vary by workflow complexity.”

## Claim status

| Status | Meaning | Can use in ads? |
|---|---|---:|
| Draft | Unreviewed | No |
| Evidence pending | Needs proof | No |
| Approved | Use with approved wording | Yes |
| Approved with disclaimer | Use only with linked disclaimer | Yes |
| Expired | Needs revalidation | No |
| Blocked | Never use | No |

## Example claim graph

```yaml
product: SupportFlow AI
feature: Ticket summarisation
claim:
  id: CLM-001
  raw: Turns messy support emails into structured tickets
  approved_wording:
    - Convert support emails into structured ticket drafts.
    - Draft customer, urgency, and reproduction-step fields from inbound support emails.
  prohibited_wording:
    - Fully automates support work
    - Replaces your support team
    - 100% accurate ticket creation
  proof:
    type: demo
    url: https://example.com/demo/ticket-summarisation
  limitations:
    - Human review recommended before sending customer-facing responses.
    - Accuracy depends on source email clarity.
  risk: medium
  expiry: 2026-09-30
```

## Generation rule

Every ad should include at least one of:

- proof link,
- demo path,
- mechanism explanation,
- visible output,
- limitation or scope statement.

This is how you market to skeptical buyers without relying on blind belief.
