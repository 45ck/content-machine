# Channel Strategy Router

## Purpose

The agent should not generate the same message for every channel. Channel choice encodes buyer state.

## Routing logic

| Buyer state | Search | Social | LinkedIn | YouTube/short video | Retargeting | Email/product |
|---|---|---|---|---|---|---|
| Unaware | Weak | Strong | Medium | Strong | Weak | Weak |
| Problem-aware | Medium | Strong | Strong | Strong | Medium | Medium |
| Solution-aware | Strong | Medium | Strong | Medium | Strong | Medium |
| Vendor-aware | Strong | Weak | Medium | Medium | Strong | Strong |
| Active buyer | Strong | Weak | Medium | Weak | Strong | Strong |
| Trial user | Weak | Weak | Weak | Weak | Medium | Strong |
| Expansion | Weak | Weak | Medium | Weak | Medium | Strong |

## Channel-specific mindset

### Search

Capture active intent. Use specificity and match the query's buying stage.

### AI Max / automated search layers

Treat AI Max as controlled expansion. Use text guidelines, brand controls, URL inclusions/exclusions, and reporting to prevent automation drift.

### Social

Create recognition. Show a painful moment, visible transformation, or strong point of view.

### LinkedIn

Respect role, budget, and internal politics. Ads should help the buyer justify investigation to themselves and stakeholders.

### YouTube/Demand Gen

Demonstrate. Use before/after workflows, proof, and narrative. Avoid pure feature lists.

### Retargeting

Resolve the next objection. Sequence proof:

1. demo,
2. case study,
3. comparison,
4. security/implementation,
5. trial/demo CTA.

### Email/product messaging

Guide activation. Users who have signed up need progress, not persuasion.

## Router output

```json
{
  "hypothesis": "Privacy anxiety blocks trial starts",
  "buyer_state": "vendor_aware",
  "channel": "retargeting",
  "format": "static + landing page module",
  "message": "See exactly what permissions are required before connecting your inbox",
  "proof": "permission-scope screenshot",
  "cta": "View permission preview"
}
```
