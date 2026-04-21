# Privacy, Security, and Consent for Autonomous Ads

## Principle

Autonomous systems should use the minimum buyer data needed to create useful relevance.

## Data classes

| Class | Examples | Rule |
|---|---|---|
| Public product info | docs, pricing, website | Safe to use, verify freshness |
| First-party behavioural | page views, trial events | Use with consent and minimisation |
| CRM/sales | role, company, stage | Limit access, audit usage |
| Support/customer data | tickets, chats | De-identify before model use |
| Sensitive data | health, finance, children, protected traits | Avoid unless legally reviewed |
| Secrets | tokens, passwords, API keys | Never expose to model prompts |

## Consent-aware personalisation

Prefer segment-level personalisation:

- company size,
- role/job function,
- lifecycle stage,
- product usage milestone,
- industry where allowed,
- broad problem category.

Avoid invasive personalisation:

- “We saw you looked at pricing three times.”
- “Still struggling with your anxiety?”
- “Your company is probably wasting $X.”
- claims based on sensitive inferred traits.

## Data minimisation checklist

- Can the model produce the output without raw personal data?
- Can data be aggregated or anonymised?
- Is there a retention period?
- Is there an audit log?
- Is opt-out honoured?
- Are model prompts stored? If yes, where?
- Are API keys isolated from agent context?

## Security controls

- Separate read tools from write tools.
- Use least-privilege API tokens.
- Require approval tokens for launch actions.
- Log all tool calls.
- Store prompts and outputs for audit.
- Redact secrets before model calls.
- Use environment variables for credentials.
- Use test accounts before production.

## Mindset

The buyer should feel relevance, not surveillance.
