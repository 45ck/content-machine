# Clip Selection And Reframing Deep Dive

Date: 2026-04-29

## Purpose

Longform-to-short systems win or fail before captions and render. The deeper
repo pass shows that strong clippers preserve multiple candidates, record why
each candidate was chosen, let humans approve or reorder them, and treat
vertical reframing as a per-clip/per-scene artifact.

## Source Signals

| Source                                            | Signal                                                                                                                              | Content-machine takeaway                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `imgly__videoclipper`                             | LLM returns selected transcript text, then code maps that text back to word timestamps                                              | Add a text-selection matching path; do not ask models to invent timestamps     |
| `zhouxiaoka__autoclip`                            | Clip model stores status, start/end, score, recommendation reason, tags, metadata, thumbnail, video path, and collection membership | Candidate review needs persisted score, reason, status, and collection order   |
| `SamurAIGPT__AI-Youtube-Shorts-Generator`         | Face videos use a static median face crop; screen recordings use smoothed optical-flow tracking                                     | Reframing must branch between face-led and screen-led crop modes               |
| `hikg4593__vizard`                                | Product-level pattern: speech, visual cues, sentiment, active speaker tracking, multiple aspect ratios                              | Candidate scoring should combine transcript, source-media, and crop confidence |
| Current `src/highlights/selector.ts`              | Deterministic window scoring for hook, coherence, payoff, boundary, silence risk, filler risk                                       | Keep deterministic baseline but add semantic candidate layer                   |
| Current `src/highlights/source-media-analysis.ts` | ffprobe, scene-change density, silence gaps, volume analysis                                                                        | Good technical base; missing content inspection, face/speaker/cursor signals   |

## Candidate Layers

### Layer 1: Deterministic Windows

Keep the current `deterministic-transcript-window-v1` path. It is useful as a
baseline because it is cheap, repeatable, and does not hallucinate. It should
continue to produce hook/coherence/payoff/boundary/filler/silence scores.

### Layer 2: Semantic Text Selections

Add `text-selection-candidates.v1.json`:

- `selection_id`
- `source_transcript_text`
- `selected_text`
- `matched_word_start_index`
- `matched_word_end_index`
- `match_confidence`
- `unmatched_ranges`
- `selection_prompt_contract`
- `reason`

This follows the IMG.LY pattern: the model selects words from the transcript,
and deterministic matching converts the words into timestamps.

### Layer 3: Candidate Collections

Add `clip-collection.v1.json`:

- `collection_id`
- `source_media_id`
- `candidate_ids`
- `manual_order`
- `collection_reason`
- `approved_for_render`
- `rejected_candidate_ids`

This mirrors the AutoClip pattern where clips can be grouped, reordered, and
exported as a sequence rather than only selecting one "best" clip.

## Reframing Layers

### Face-Led Crop

Use when the source is a person, interview, podcast, or webcam clip.

Artifact: `speaker-face-map.v1.json`

- `speaker_id`
- `face_track_id`
- `face_bbox_samples`
- `mapping_confidence`
- `user_confirmed`
- `fallback_speaker_id`

### Screen-Led Crop

Use when the source is a screen recording, gameplay, cursor movement, or UI
demo.

Artifact: `smart-crop-track.v1.json`

- `crop_mode`: `screen_motion`, `cursor`, `object`, `center`, `manual`
- `frame_samples`
- `target_x`
- `target_y`
- `smoothing_policy`
- `max_shift_per_second`
- `confidence`

### Hybrid Crop

Use when faces and screen content both matter.

Artifact: `crop-plan.v1.json` should support per-segment strategy changes:

- `segments[]`
- `segment_start_sec`
- `segment_end_sec`
- `crop_mode`
- `target_subject`
- `safe_zone`
- `caption_lane`
- `fallback_reason`

## Implementation Delta

Current content-machine has:

- deterministic candidate scoring
- source silence and scene-change measurement
- approval artifact
- boundary snapping

Missing:

- semantic text selection and transcript matching
- candidate collections and manual ordering
- face/speaker mapping
- screen/cursor/motion crop tracks
- crop confidence feeding candidate ranking
- post-crop review frames per candidate

## Quality Gates

- A selected clip must have either deterministic score, semantic selection
  reason, or both.
- A longform edit must preserve source-word integrity unless explicitly
  rewritten as new script copy.
- A vertical crop must identify its mode and target subject.
- Face-led crops need stable face visibility; screen-led crops need readable UI
  after crop.
- Human approval should happen before batch rendering a candidate collection.

## Bead Targets

This report supports:

- `content-machine-ar2`: text-selection-to-timestamps extraction.
- `content-machine-ar9`: clip candidates, crop plan, and run ledger.
- `content-machine-ar14`: semantic clip selection and collections.
- `content-machine-ar15`: speaker-aware and screen-aware crop tracks.
