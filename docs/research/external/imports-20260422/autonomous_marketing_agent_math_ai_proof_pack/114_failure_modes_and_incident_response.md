# Failure Modes and Incident Response

## Common failure modes

### 1. Unsupported claim launch

Example: agent says “save 10 hours/week” without approved evidence.

Response:

- pause affected ads,
- identify affected platforms,
- log incident,
- publish correction if needed,
- update eval set,
- block phrase/claim.

### 2. Landing page mismatch

Example: ad promises sandbox but page requires sales call.

Response:

- pause or reroute ad,
- fix page,
- add page-ad consistency test.

### 3. Budget runaway

Example: automated scaling exceeds intended spend.

Response:

- emergency pause,
- revoke launch token,
- inspect budget guard logs,
- lower caps,
- require approval for future increases.

### 4. Bad audience expansion

Example: ad reaches irrelevant or sensitive audience.

Response:

- pause targeting,
- tighten exclusions,
- review platform settings,
- update audience guardrails.

### 5. Fake or hallucinated proof

Example: generated case study/customer quote.

Response:

- block asset,
- review all assets with testimonials,
- require proof links for any testimonial.

### 6. Platform account risk

Example: repeated policy disapprovals.

Response:

- pause new launches,
- audit claim bank,
- remove risky patterns,
- lower autonomy level.

## Severity levels

| Severity | Definition | Response |
|---|---|---|
| S1 | Legal, severe platform, or material trust harm | Stop launches, escalate immediately |
| S2 | Unsupported claims or significant spend issue | Pause affected campaigns, review |
| S3 | Isolated policy rejection or page mismatch | Fix and update eval |
| S4 | Low-risk quality issue | Add to learning backlog |

## Incident report template

```markdown
# Ad Factory Incident

Date:
Severity:
Detected by:
Affected platforms:
Campaign/ad IDs:
What happened:
Root cause:
Actions taken:
Preventive controls added:
Owner:
Review date:
```

## Mindset

Assume failures will occur. Design so they are small, visible, and reversible.
