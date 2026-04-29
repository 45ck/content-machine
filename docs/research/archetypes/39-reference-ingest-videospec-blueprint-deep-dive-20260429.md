# Reference Ingest, VideoSpec, And Blueprint Deep Dive

Date: 2026-04-29

## Purpose

The research pack has archetype docs and public reference metadata, but a
winner-style production system also needs local reverse engineering of actual
reference clips. Content-machine already has `reverse-engineer-winner`, ingest,
VideoSpec, theme classification, blueprint extraction, and frame analysis
surfaces. This report turns that path into a reusable artifact lane.

## Source Signals

| Source                           | Signal                                                                                  | Content-machine takeaway                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `skills/reverse-engineer-winner` | Agent-facing skill for analyzing a reference short                                      | Reference analysis should produce reusable files before generation             |
| `scripts/harness/ingest.ts`      | JSON-stdio harness for local or resolved video input                                    | The harness is the correct execution surface for reverse engineering           |
| `src/harness/ingest.ts`          | Emits `videospec.v1.json`, `theme.v1.json`, `blueprint.v1.json`, and frame analysis     | Ingest already has the core artifact chain                                     |
| `src/videospec/schema.ts`        | Captures timeline, captions, overlays, motion, OCR, inserted content, and provenance    | Reference analysis can inspect structure, not just transcript                  |
| `src/videointel/classify.ts`     | Heuristic or LLM classification into video theme                                        | Archetype classification should be stored with confidence and fallback notes   |
| `src/videointel/blueprint.ts`    | Extracts scene slots, pacing, captions, audio, narrative, and inserted-content patterns | Blueprint extraction should become the bridge from reference to new production |

## Artifact Stack

### `reference-ingest-request.v1.json`

Purpose: preserve how a reference clip was analyzed.

Fields:

- `video_path`
- `input_source`
- `include_frame_analysis`
- `videospec_options`
- `classify_options`
- `blueprint_options`
- `rights_status`
- `public_reference_use_path`

### `videospec.v1.json`

Purpose: structural reverse-engineering output for a reference clip.

Required checks:

- `meta.version` is `VideoSpec.v1`
- duration, frame rate, and resolution are present
- shot timeline is nonnegative and ordered
- caption, overlay, and camera-motion time ranges are valid
- inserted-content OCR and keyframe provenance are retained when enabled

### `video-theme.v1.json`

Purpose: classify the reference into a production theme.

Fields:

- `source_videospec`
- `archetype`
- `archetype_confidence`
- `purpose`
- `format`
- `style`
- `edit_signature`
- `provenance`

### `video-blueprint.v1.json`

Purpose: convert the reference into a reusable recipe.

Fields:

- `source_videospec`
- `source_theme`
- `archetype`
- `scene_slots`
- `pacing_profile`
- `caption_profile`
- `audio_profile`
- `narrative_structure`
- `inserted_content_pattern`
- `provenance`

### `reference-frame-analysis.v1.json`

Purpose: index extracted frames and shot samples for visual inspection.

Fields:

- `input_video`
- `mode`
- `sample_paths`
- `shot_sample_paths`
- `segment_sample_paths`
- `manifest_path`
- `warnings`

### `reference-to-production-brief.v1.json`

Purpose: bridge a reference blueprint into a safe production request.

Fields:

- `reference_id`
- `videospec_path`
- `theme_path`
- `blueprint_path`
- `chosen_archetype`
- `allowed_borrowed_behaviors`
- `blocked_copied_elements`
- `asset_requirements`
- `quality_gates`

## Implementation Delta

The ingest path already emits most of the needed files. The missing layer is a
small wrapper artifact that records ingest settings, rights boundary, and the
approved behaviors that may be borrowed from the reference. That wrapper lets
`generate-short` consume structure without copying protected media or text.

## Quality Gates

- Public references must remain metadata-only unless rights are cleared.
- Blueprint extraction cannot be treated as a license to copy shots, captions,
  audio, faces, or brand assets.
- Theme classification should record whether it was heuristic or LLM-derived.
- Frame analysis must be linked when visual style claims depend on reference
  frames.
- Generation from a reference should consume `reference-to-production-brief`,
  not raw downloaded media.

## Bead Targets

This report supports:

- `content-machine-ar27`: public reference and rights gates.
- `content-machine-ar29`: reference ingest request, VideoSpec/theme/blueprint
  validation, frame analysis, and reference-to-production brief artifacts.
