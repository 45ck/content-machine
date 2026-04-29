# Content-Machine Extraction Targets

Date: 2026-04-29

## Target 1: `director-score.v1.json`

Inspired by OpenReels, OpenMontage, AI Story, and ArcReel.

Purpose: one structured creative plan that every downstream stage reads.

Minimum fields:

- `objective`
- `archetype`
- `platform_profile`
- `scenes[]`
- `visual_intent`
- `voiceover`
- `caption_style`
- `music_arc`
- `transition`
- `asset_requirements`
- `quality_gates`

Why: generated assets feel disconnected when each stage invents its own plan.

## Target 2: `clip-candidates.v2.json`

Inspired by Podcli, Vinci Clips, Vizard, AutoClip, SamurAIGPT, and Clip
Anything.

Minimum fields:

- `source_id`
- `start_sec`
- `end_sec`
- `hook_line`
- `score_total`
- `score_dimensions`
- `reason`
- `transcript_excerpt`
- `visual_cues`
- `audio_cues`
- `dedupe_group`
- `approval_status`

Why: one "best" clip hides uncertainty and makes review weak.

## Target 3: `crop-plan.v1.json`

Inspired by Podcli, Vinci Clips, ClippedAI, Vizard, and SamurAIGPT.

Minimum fields:

- `crop_mode`: face, speaker, object, center, split_screen, screen_recording
- `target_subject`
- `source_aspect`
- `output_aspect`
- `tracking_strategy`
- `safe_zone`
- `fallback_reason`
- `confidence`

Why: vertical reframing is a creative decision and a quality risk.

## Target 4: `asset-ledger.v1.json`

Inspired by OpenMontage, ArcReel, AI Story, and the content-machine asset
policy.

Minimum fields:

- `asset_id`
- `source_kind`
- `source_url`
- `license`
- `owner`
- `allowed_uses`
- `copied_to`
- `used_in_stage`
- `review_status`

Why: without provenance, public-video research turns into unsafe production
assets.

## Target 5: `caption-recipe.v1.json`

Inspired by r/Shorts, Podcli, CapCut tutorials, ClippedAI, and OpenReels.

Minimum fields:

- `style_id`
- `archetype`
- `font`
- `case`
- `max_lines`
- `max_chars_per_line`
- `active_word_treatment`
- `stroke_shadow`
- `safe_zone`
- `jitter_policy`

Why: captions are part of the edit, not a generic subtitle export.

## Target 6: `visual-match-report.v1.json`

Inspired by OpenReels, AI Short Video Engine, and OpenMontage.

Minimum fields:

- `scene_id`
- `requested_visual`
- `candidate_asset`
- `match_score`
- `mismatch_reasons`
- `query_rewrites`
- `accepted`

Why: stock and generated visuals often match keywords but miss the scene.

## Target 7: `run-ledger.v1.jsonl`

Inspired by AutoClip, ArcReel, AI Story, OpenMontage, and content-machine's
observability principles.

Purpose: every stage emits durable progress, provider, cost, and decision
events.

Why: agent workflows need resumability and post-run auditability.

## Target 8: Review Gates

Turn the above artifacts into publish-prep gates:

- no unknown assets
- no public video used as footage without clearance
- no caption overlap with platform chrome
- no boxed/guttered video unless intentional
- no disconnected visual scene
- no hidden provider/cost decision
- no duplicate longform clip
- no one-shot "viral score" without explanation
