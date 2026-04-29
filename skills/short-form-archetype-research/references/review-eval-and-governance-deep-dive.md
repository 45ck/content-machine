# Review, Eval, And Governance Deep Dive

Date: 2026-04-29

## Purpose

The strongest repos do not stop at successful encoding. They validate the
rendered output, record provider and budget decisions, inspect frames and
audio, and turn review failures into concrete rerun actions. This report maps
that pattern to content-machine review and eval artifacts.

## Source Signals

| Source                                         | Signal                                                                                                              | Content-machine takeaway                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `calesthio__OpenMontage` final review schema   | ffprobe, frame spotcheck, audio spotcheck, promise preservation, subtitle check, transcript comparison, next action | Publish review should produce a go/no-go action, not just metrics  |
| `calesthio__OpenMontage` cost log schema       | estimated, reserved, actual, failed, refunded spend                                                                 | Provider calls need cost lifecycle records                         |
| `calesthio__OpenMontage` edit decisions schema | cuts, transforms, overlays, audio, subtitles, renderer family, runtime, slideshow risk                              | Render should be traceable to edit decisions                       |
| OpenMontage README governance                  | pre-compose validation, post-render self-review, slideshow risk, source media inspection, scored provider selection | Quality gates should exist before and after render                 |
| Current `publish-prep` harness                 | script scoring, validation gates, caption-sync analysis, publish metadata                                           | Good review base; missing source/asset/crop/provider/budget checks |
| Existing research rubric                       | archetype parity, captions, assets, platform fit                                                                    | Eval fixtures should be generated from research artifacts          |

## Review Bundle

Add `review-bundle.v1.json` as the handoff wrapper for publish review.

Minimum fields:

- `video_path`
- `script_path`
- `render_report_path`
- `caption_export_report_path`
- `crop_review_path`
- `asset_ledger_path`
- `visual_match_report_path`
- `source_media_review_path`
- `decision_log_path`
- `cost_log_path`
- `gate_results`
- `status`: `pass`, `revise`, or `fail`
- `recommended_action`

## Final Review Checks

### Technical Probe

- valid container
- duration
- resolution
- fps
- codecs
- file size
- platform profile match

### Visual Spotcheck

- sample opening, midpoint, peak moment, ending
- black frames
- frozen frames
- missing assets
- broken overlays
- unreadable text
- caption/platform collisions
- crop target offscreen

### Audio Spotcheck

- narration present
- music present if expected
- silence
- clipping
- intelligibility
- ducking problems

### Promise Preservation

- chosen archetype still recognizable
- renderer runtime matches locked decision
- motion/slideshow promise honored
- no silent provider downgrade
- planned visual intent represented

### Subtitle And Transcript Check

- captions present when expected
- coverage ratio
- timing drift
- sidecar/burned-in consistency
- output transcript matches intended script or source excerpt

## Eval Fixtures

Add `archetype-parity-fixture.v1.json`:

- `fixture_id`
- `archetype`
- `reference_docs`
- `blueprint_path`
- `recipe_path`
- `expected_artifacts`
- `required_gates`
- `sample_inputs`
- `scoring_weights`
- `failure_examples`

This turns the research pack into executable quality pressure. The first
fixtures should cover:

- Reddit story gameplay
- longform clip factory
- topic faceless explainer
- UGC/avatar product short
- motion graphics lesson
- caption/export primitives

## Governance Artifacts

### `provider-selection.v1.json`

- provider options
- task fit
- quality
- control
- reliability
- cost
- latency
- continuity
- selected provider
- reason

### `cost-log.v1.json`

- estimated spend
- reserved spend
- actual spend
- failed/refunded operations
- per-stage cost
- budget mode

### `review-action.v1.json`

- failing gate
- proposed fix
- rerun stage
- upstream artifacts to preserve
- downstream artifacts to invalidate

## Implementation Delta

Current `publish-prep` can validate the rendered MP4, score the script, produce
publish metadata, and run caption sync when a caption export exists. The next
layer should make it artifact-aware: read crop, asset, visual-match, decision,
and cost artifacts, then return a concrete rerun action when a gate fails.

## Bead Targets

This report supports:

- `content-machine-ar5`: archetype parity evals.
- `content-machine-ar13`: workflow ledger and approval architecture.
- `content-machine-ar17`: final review bundle and cost/provider governance.
- `content-machine-ar18`: archetype parity fixture generator.
