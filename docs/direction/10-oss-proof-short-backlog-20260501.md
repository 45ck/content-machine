# OSS Proof Short Backlog

Date: 2026-05-01
Status: direction backlog

## Boundary

These are generic Content Machine improvements for proof-led short-form production. They must stay product-neutral and should not reference any private downstream product, customer, or campaign.

Content Machine should provide reusable skills, templates, schemas, validation, and harness runners. Downstream products own their own prompts, proof ledgers, claim banks, distribution strategy, and publishing decisions.

## Backlog

### P0: Harden Installed Package Runner

`agent/run-tool.mjs` should work from the published package and expose the harness-backed tools advertised by skills and docs.

Acceptance:

- clean install in an empty project can run `skill-catalog`
- clean install can run `flow-catalog`
- clean install can run `doctor-report`
- clean install can run one mock `generate-short`
- `dist` exports match agent runner imports
- missing harness-backed skills are registered or removed from docs

### P1: Proof-First Product Short Lane

Create a generic short lane for proof-led product assets.

Pattern:

```text
incident/result
  -> prompt/comment/source request
  -> visible behavior
  -> proof receipt / claim boundary
  -> concrete CTA
```

Acceptance:

- skill or template exists with example request
- requires proof/source artifact references
- emits sidecars suitable for `publish-prep-review`
- no product-specific references

### P1: Comment-To-Build Short Recipe

Create a generic recipe that turns a viewer comment/request into a built or demoed result.

Acceptance:

- documents required inputs
- supports proof and prototype labeling
- includes scene structure, CTA, and example request
- simulated assets are labeled as concept/prototype

### P1: Claim-Boundary Gate

Add a publish-prep gate for claim boundaries.

Acceptance:

- publish-prep reads claim-boundary metadata
- proof claims fail closed when evidence is missing
- simulated UI/log/gameplay content is classified as concept/prototype/test-only
- `publish.json` records allowed and blocked claims

### P1: Audio-Required Quality Gate

Strengthen audio validation for public shorts.

Acceptance:

- missing, silent, near-silent, or music-only audio fails when the lane requires narration or meaningful audio
- public proof/product lanes require narration or intentional audio bed
- internal-review-only exceptions are explicit

### P2: Duration Defaults

Resolve short-duration defaults across docs, schemas, and runtime code.

Acceptance:

- docs and code agree on default duration behavior
- teaser/proof/story lanes have explicit duration ranges
- tests cover default duration selection

## Tracker Note

The matching Beads issues could not be created in this environment because the Content Machine tracker is configured for a Dolt server database and the local database is unhealthy after bootstrap (`database "content_machine" not found`). Create the issues from this backlog after `bd doctor` is clean.
