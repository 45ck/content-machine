# Source Media, Asset, And Visual Verification Deep Dive

Date: 2026-04-29

## Purpose

Short-form production systems need to know what media actually contains, where
assets came from, and whether selected visuals match scene intent. The deeper
repo pass shows that the strongest systems inspect media before planning and
record asset provenance before rendering.

## Source Signals

| Source                                                   | Signal                                                                                                                                  | Content-machine takeaway                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `calesthio__OpenMontage` source media review schema      | Requires actual inspection, technical probe, content summary, representative frames, risks, usable-for notes, and planning implications | Add a richer layer above current technical source probe             |
| `calesthio__OpenMontage` asset manifest schema           | Tracks asset path, source tool, scene id, prompt, seed, model, cost, provider, license, and original URL                                | Expand asset ledger from compliance-only to production trace        |
| `digitalsamba__claude-code-video-toolkit` project schema | Separates planned scene assets from filesystem truth and marks asset-needed, asset-present, asset-missing, ready                        | Reconcile expected assets with actual files before render           |
| `xhongc__ai_story` asset UI                              | Keeps image assets, provider choice, generated preview, prompt variables, and reusable global variables visible                         | Generated assets need preview and provider metadata                 |
| `chenwr727__AI-Short-Video-Engine`                       | Provider interfaces for material search, TTS, LLM, subtitle, and video                                                                  | Asset provenance should include provider and query/prompt route     |
| Current `source-media-analyze` harness                   | Records technical probe, audio energy, silence, scene changes                                                                           | Good base, but it does not summarize visual content or planning use |

## Artifact Stack

### `source-media-review.v1.json`

Purpose: inspected source media before creative planning.

Minimum fields:

- `files[]`
- `technical_probe`
- `representative_frames`
- `content_summary`
- `transcript_summary`
- `quality_risks`
- `usable_for`
- `planning_implications`
- `reviewed`: must be true only after real inspection

This should sit above `source-media-analysis.v1.json`. The current analysis
artifact answers "what are the technical signals?" The review artifact answers
"what can this actually be used for?"

### `frame-samples.v1.json`

Purpose: reusable visual evidence for source review, crop review, and final
review.

Minimum fields:

- `media_path`
- `sample_strategy`
- `frames[]`
- `timestamp_sec`
- `frame_path`
- `reason`
- `detected_risks`

### `asset-ledger.v2.json`

Purpose: full asset provenance and production trace.

Additional fields beyond the earlier ledger:

- `scene_id`
- `asset_role`
- `provider`
- `query`
- `prompt`
- `model`
- `seed`
- `cost_usd`
- `license`
- `original_url`
- `fingerprint`
- `review_status`

### `visual-match-report.v2.json`

Purpose: verify that selected stock, generated media, or user media actually
matches the scene.

Minimum fields:

- `scene_id`
- `requested_visual`
- `candidate_asset_id`
- `match_score`
- `subject_match`
- `action_match`
- `style_match`
- `caption_lane_clear`
- `safe_zone_clear`
- `mismatch_reasons`
- `accepted`

## Implementation Delta

Current content-machine already has media probing and asset indexes. The next
step is to add source-content review and visual-match review as separate gates.
That prevents a common failure: planning a scene from a filename or keyword
instead of the actual media.

`source-media-review.v1.json` should be generated before longform highlight
selection when user media is supplied. `visual-match-report.v2.json` should be
generated before render for each scene that uses stock, generated, or reused
media.

## Quality Gates

- Do not plan around a source asset that was not inspected.
- Do not use public video footage unless the asset ledger records rights or
  explicit permission.
- Do not accept stock/generated media on keyword match alone.
- Do not render if a required scene asset is still `asset-needed` or
  `asset-missing`.
- Do not approve a visual that destroys the planned caption lane or platform
  safe zone.

## Bead Targets

This report supports:

- `content-machine-ar3`: crop-plan and asset-provenance artifacts.
- `content-machine-ar6`: licensed reference video corpus workflow.
- `content-machine-ar9`: asset ledger and visual match report.
- `content-machine-ar16`: source media review and visual verification.
