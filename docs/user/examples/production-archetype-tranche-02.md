# Production Archetype Tranche 02

This additive registry slice covers six product-native short-form patterns. It is
loaded from the direct Content Machine checkout and does not replace the primary
production registry.

Registry path:

```text
assets/archetypes/production/tranches/tranche-02-product-native.v1.json
```

## Selection matrix

| Archetype                           | Use when                                                                                                                             | Do not use when                                                                                                             | Cost | Implementation |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---- | -------------- |
| `ugc-avatar-product-proof`          | An authorized real presenter or disclosed synthetic avatar can demonstrate an actual product state or result.                        | Consent, disclosure, truthful experience, or representative-results support is missing.                                     | L2   | Skill-backed   |
| `comment-reply-short`               | An owned or permissioned comment creates a focused question that can be answered with evidence.                                      | The comment is private, identifying, abusive, or would require an account action to obtain.                                 | L0   | Backlog        |
| `document-to-gameplay-explainer`    | A licensed or permissioned document needs an accessible visual explanation and owned procedural gameplay can carry secondary motion. | The document rights are unknown, copied text would substitute for the source, or gameplay is downloaded from a creator.     | L0   | Skill-backed   |
| `before-after-transformation-proof` | Matched owned captures can show a real intervention and comparable result.                                                           | Conditions differ, retouching changes the evidence, consent is absent, or an exceptional result would be framed as typical. | L0   | Skill-backed   |
| `search-intent-answer`              | A specific question can be answered directly with first-party facts and code-native cards or diagrams.                               | Search demand or ranking would be fabricated, the answer is stale or high-stakes, or the short never resolves the query.    | L0   | Skill-backed   |
| `review-mined-product-proof`        | A genuine, traceable review can supply a customer-language problem that is then answered with owned product proof.                   | The review is fake, copied without authority, selectively incentivized, distorted, or presented as typical without support. | L0   | Skill-backed   |

## Shared production boundary

- Creator videos, platform layouts, comments, reviews, and gameplay are pattern
  references only unless a specific asset has documented reuse authority.
- Reconstruct interface surfaces with generic components. Do not copy platform
  trade dress or expose private identifiers.
- Keep asset-level provenance and the applicable license, permission, consent,
  attribution, and transformation record with the production packet.
- A public document or comment is not automatically free to reproduce. Prefer a
  narrow quotation, paraphrase, or original visualization and stop for rights
  review when authority is unclear.
- Every phone example is specified at 1080 by 1920 with explicit caption and
  evidence layers. It is a layout example, not a rendered endorsement or
  platform-specific recommendation.

## Validate the tranche

From the direct checkout root:

```powershell
@{ registryPath = 'assets/archetypes/production/tranches/tranche-02-product-native.v1.json' } |
  ConvertTo-Json |
  node --import tsx scripts/harness/archetype-lane-catalog.ts

npx --no-install vitest run src/archetypes/production-registry.tranche-02.test.ts
```

The registry deliberately contains no observed probabilities, audience claims,
platform weights, performance statistics, or per-video REDCOW assessments. It
also grants no publishing, analytics, provider, account, or spend authority.
