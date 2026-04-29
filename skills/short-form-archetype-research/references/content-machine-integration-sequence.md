# Content-Machine Integration Sequence

Date: 2026-04-29

## Purpose

The research pack now describes enough runtime artifacts that implementation
needs an order of operations. This sequence keeps the work incremental and
fits the existing skill and harness surfaces.

## Current Strong Base

Content-machine already has:

- skills as the preferred agent surface
- `source-media-analyze`
- `longform-highlight-select`
- `boundary-snap`
- `highlight-approval`
- `video-render`
- `publish-prep-review`
- JSON stdio harnesses
- progress JSONL emitters
- script, audio, visual, render, validate, score, and publish modules

The next work should not create a second control plane. It should enrich these
stages with the deeper artifacts.

## Sequence

### 1. Source Review Before Selection

Add `source-media-review.v1.json` beside `source-media-analysis.v1.json`.

Why first: highlight selection, crop planning, and visual reuse should depend
on what the media actually contains.

### 2. Semantic Candidate Selection

Add `text-selection-candidates.v1.json`, then merge deterministic and semantic
results into `clip-candidates.v2.json`.

Why second: this closes the largest longform quality gap without touching the
renderer.

### 3. Candidate Collections

Add `clip-collection.v1.json` and let approval preserve manual ordering.

Why third: batch clipping and review need more than one selected candidate.

### 4. Smart Crop Tracks

Add `speaker-face-map.v1.json`, `smart-crop-track.v1.json`, and richer
`crop-plan.v1.json`.

Why fourth: crop confidence should affect render readiness and candidate rank.

### 5. Asset And Visual Match

Upgrade `asset-ledger.v1.json` toward `asset-ledger.v2.json` and add
`visual-match-report.v2.json`.

Why fifth: topic-to-short and generated-asset lanes need this before final
review can be strict.

### 6. Render Decision And Edit Decisions

Add `render-runtime-decision.v1.json` and `edit-decisions.v1.json`.

Why sixth: renderer choice and edit plan should be locked before render.

### 7. Review Bundle

Add `review-bundle.v1.json` on top of `publish-prep`.

Why seventh: review should aggregate script score, render validation, captions,
crop, assets, visual match, source review, provider decisions, and cost.

### 8. Parity Fixtures

Add `archetype-parity-fixture.v1.json` generation from the research pack.

Why eighth: once artifacts exist, fixtures can enforce the quality bar.

## Harness Mapping

| Existing harness            | Near-term addition                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `source-media-analyze`      | emit or feed `source-media-review.v1.json`                                               |
| `longform-highlight-select` | accept semantic selections and output `clip-candidates.v2.json`                          |
| `highlight-approval`        | preserve `clip-collection.v1.json` order and notes                                       |
| `boundary-snap`             | write source-word integrity status                                                       |
| `video-render`              | require render decision, crop plan, caption render plan, and edit decisions when present |
| `publish-prep`              | aggregate review bundle and return rerun action                                          |

## Skill Mapping

| Existing skill                  | Deeper artifact dependency                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| `longform-to-shorts`            | source review, semantic selection, crop tracks, collection approval |
| `reframe-vertical`              | speaker-face map and smart-crop track                               |
| `short-form-captions`           | caption groups, render plan, export report                          |
| `source-media-review`           | source-media-review and frame samples                               |
| `scene-aware-smart-crop`        | per-scene crop plan and crop review                                 |
| `publish-prep-review`           | review bundle and review action                                     |
| `short-form-archetype-research` | roadmap, parity fixtures, quality gates                             |

## Stop Conditions

Do not proceed to render when:

- source media has not been reviewed
- selected clip lacks timestamp match confidence
- crop mode is unknown for non-portrait source footage
- required assets are missing or unlicensed
- renderer decision is absent
- caption render plan is missing for caption-heavy archetypes

Do not present a render as complete when:

- review status is `revise` or `fail`
- final review did not inspect actual output frames
- source-word integrity failed
- asset ledger has unknown or prohibited assets
- platform profile gates fail

## Bead Targets

This sequence organizes:

- `content-machine-ar10` through `content-machine-ar18`
- the existing longform path
- the short-form archetype research skill
- future parity eval implementation
