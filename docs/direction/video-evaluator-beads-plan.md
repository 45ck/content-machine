# Video Evaluator Migration Beads Plan

`content-machine` already has a Beads store, but this checkout is configured
for an external Dolt server database named `content_machine`. On this machine
`dolt` is not installed, so `bd ready` and `bd create` cannot safely write to
the existing tracker without changing the repo's Beads backend.

This file records the Beads-ready work for `content-machine` until the tracker
is available again.

## Current Limitation

Observed command failure:

```text
failed to open database: Dolt server unreachable at 127.0.0.1:0 and auto-start failed: dolt is not installed
```

Do not hand-edit `.beads/issues.jsonl` for this repo unless we intentionally
switch the tracker to JSONL/no-db or reinitialize from JSONL. The current
metadata says this repo uses a Dolt server backend, so the safe choices are:

- Install/start the expected Dolt-backed Beads environment and run `bd create`.
- Intentionally migrate the tracker backend with a separate explicit task.
- Keep this document as the source for issue creation until the tracker works.

## Beads-Ready Issues

| Priority | Title                                                                | Dependencies                                         | Acceptance Criteria                                                                                                                                                           |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Adopt `@45ck/video-evaluator` as analyzer dependency                 | none                                                 | `package.json` uses an exact `@45ck/video-evaluator` version; no committed `file:` dependency; adapter imports package exports; `npm run typecheck` passes.                   |
| P0       | Add video-evaluator technical review parity tool                     | upstream `video-evaluator` contracts                 | `video-evaluator` emits `video-technical.report.json`, contact sheets, current demo-audit issue codes, and optional layout safety reports for `.layout.json` sidecars.        |
| P1       | Migrate render/ingest frame analysis to evaluator artifacts          | dependency issue, technical review or storyboard API | `cm render --frame-analysis*` and `harness:ingest` still return `frameAnalysisManifestPath`; generated frames come from evaluator storyboard/shots; old tests are updated.    |
| P1       | Preserve docs/demo audit output via evaluator wrapper                | dependency issue, technical review tool              | `npm run review:demo-videos` writes the same `summary.json`, `README.md`, per-video `report.json`, and aggregate contact sheet under `experiments/video-quality-review-demo`. |
| P1       | Add source-media-signals parity in video-evaluator                   | upstream media probe and signal analyzers            | Evaluator emits ffprobe facts, audio RMS/peak, silence gaps, scene changes, sampled frame count, and estimated scene count.                                                   |
| P1       | Adapt source-media-analyze to evaluator while preserving v1 contract | source-media-signals parity                          | `harness:source-media-analyze` writes schema-valid `source-media-analysis.v1.json`; `longform-highlight-select` tests pass unchanged or with fixture-only updates.            |
| P1       | Update review docs and skill guidance for evaluator ownership        | demo audit wrapper, source adapter                   | Docs and skills name `@45ck/video-evaluator` as the analyzer owner; current command examples still work.                                                                      |
| P2       | Delete migrated local analyzer code after parity                     | all migration issues                                 | Superseded local analyzers are removed or retained with rationale; `npm run quality` and `npm run review:demo-videos` pass.                                                   |

## Ownership Boundary

Move reusable video facts and gates to `video-evaluator`: media probe, frame
sampling, contact sheets, black/white frames, edge/gutter checks, low-motion
runs, audio presence/silence, scene/cadence, caption OCR quality, caption sync,
source media signals, and generic review bundles.

Keep `content-machine` policy local: archetype-specific publish gates, Remotion
caption sidecar mapping, script quality, short-form pacing expectations,
longform highlight scoring, publish metadata, and skills/flows that tell agents
how to make better shorts.

## Adapter/Docs First Slice

This checkout now has a local adapter boundary in
`src/adapters/video-evaluator.ts`. The adapter attempts to load
`@45ck/video-evaluator` first, then a built explicit/sibling checkout, so
content-machine can integrate the package without committing a `file:`
dependency while the package is not available from the npm registry.

`scripts/review/demo-video-audit.mjs` keeps its existing output contract:
`summary.json`, `README.md`, per-video `report.json`, frame samples, and
contact sheets stay under the same paths. When a demo MP4 has a
`.layout.json` sidecar, the script now prefers the evaluator package API
for layout safety and falls back to the previous sibling process runner.

Current integration state:

- Content Machine uses `video-evaluator` for reusable analysis in the
  docs/demo audit path, especially layout-safety evidence for graphics-heavy
  short-form examples.
- The promoted example review workflow treats evaluator artifacts as shared
  evidence, not as the content-generation control plane.
- Skills, archetype guidance, render recipes, caption styles, timing policy,
  publish metadata, and short-form send-back rules remain in this repo.
- `video-evaluator` is the target home for generic facts such as media probe
  data, source-media signals, caption OCR/sync checks, technical video review,
  contact sheets, and bundle review prompts once each surface reaches parity.

Do not remove `src/highlights/source-media-analysis.ts` or the
`source-media-analysis.v1.json` artifact until source-media signal parity
exists in `@45ck/video-evaluator` and the harness adapter preserves the v1
contract for `longform-highlight-select`.
