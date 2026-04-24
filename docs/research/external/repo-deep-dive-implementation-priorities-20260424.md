# Repo Deep Dive Implementation Priorities 20260424

## Objective

Map the strongest external short-form video repo patterns to concrete next implementation choices for `content-machine`.

This pass is intentionally narrower than the prior gap analysis. It focuses on what should change after adding the first deterministic `longform-highlight-select` harness.

## Scope

Primary repos inspected:

- `yt-short-clipper`
- `ViriaRevive`
- `video-editing-skill`
- `video-podcast-maker`
- `youtube-shorts-pipeline`
- `claude-code-video-toolkit`
- `remotion-dev-skills`
- `captacity`
- `whisperX`
- `prompt-language`

Boundary: evidence came from the local research clones under `C:\Projects\content-machine-research\repos`. This memo does not claim the upstream repositories were re-fetched today.

## Source Evidence

### `yt-short-clipper`

Evidence:

- `clipper_core.py` has a two-phase flow:
  - `find_highlights_only()`
  - `process_selected_highlights()`
- `pages/highlight_selection_page.py` supports human selection between detection and processing.
- `clipper_core.py` stores `session_data.json` with `video_path`, `srt_path`, `highlights`, `video_info`, `status`, and timestamps.
- Highlight detection is LLM-led, with a strong prompt that demands conflict, personal admission, sharp opinion, punchline, complete story, and standalone hook.

Implication for us:

- Our `highlight-candidates.v1.json` should remain a pre-render artifact.
- We need a separate approval/session artifact before clipping and render.
- The next selector should allow LLM narrative scoring, but not replace deterministic signals.

### `ViriaRevive`

Evidence:

- `detector.py` finds moments using a weighted signal:
  - 45% smoothed audio RMS energy
  - 25% volume variance
  - 30% scene-change density
- It selects non-overlapping peaks and applies a minimum gap.
- `transcriber.py` snaps clip duration to sentence-ending punctuation, natural pauses, or soft punctuation.
- `cropper.py` uses YOLO person detection with YuNet/Haar fallback, dynamic crop keyframes, gap filling, camera cut refinement, and debug frames.
- `api_bridge.py` keeps per-clip progress and stores moment metadata for upload/title generation.

Implication for us:

- Our current selector is a good first slice, but it lacks audio-energy and scene-change signals.
- Boundary snap should be its own reusable step, not embedded in render.
- Crop intelligence should come after approved candidates, because running detectors on every possible span is expensive.

### `video-editing-skill`

Evidence:

- `scripts/transcribe.py` emits silence gaps and filler-word metadata.
- It detects English and Chinese filler words and marks filler-only transcript segments.
- `scripts/media_library.py` implements a dual backend media index:
  - JSON for small libraries
  - SQLite after a threshold
- The media index tracks path, type, category, dimensions, duration, fps, file size, transcript path, tags, metadata, and timestamps.
- `scripts/render_final.py` has explicit clip resolution, B-roll handling, karaoke subtitle generation, and a guarded fallback from select-filter to trim/concat when B-roll is present.

Implication for us:

- `longform-highlight-select` should accept or derive structured silence/filler inputs, not only infer from word gaps.
- We should add a media index before building more reuse/caching skills.
- Render plans should carry explicit source-media provenance and clip references.

### `video-podcast-maker`

Evidence:

- `learn_design.py` manages `design_references/`, reference IDs, `design_references` index entries, and `style_profiles`.
- `prefs_schema.json` defines `style_profiles`, `design_references`, and `learning_history`.
- `references/workflow-steps.md` defines the priority chain:
  `Root.tsx defaults < global < topic_patterns < style_profiles < current instructions`.
- Troubleshooting notes say automatic learning history is not fully implemented, but the schema and manual profile paths exist.

Implication for us:

- A simple `style-profile.v1.json` and reference library would compound quality faster than adding more one-off prompt text.
- We should connect `reverse-engineer-winner` outputs to reusable style/profile artifacts.

### `youtube-shorts-pipeline`

Evidence:

- Niche YAML profiles shape script, visuals, voice, captions, music, thumbnail, and discovery.
- Draft generation includes script, B-roll prompts, YouTube metadata, Instagram caption, TikTok caption, and thumbnail prompt in one artifact.
- `verticals/state.py` embeds `_pipeline_state` in the draft JSON with stage status, timestamps, errors, and artifacts.
- `verticals/niche.py` provides dedicated helpers for voice, caption, and music config from the same profile.

Implication for us:

- Our `niche-profile-draft` skill is directionally right, but it needs a schema and persistence path.
- Pipeline resume state should live close to the run artifact, not only in logs or separate folders.

### `claude-code-video-toolkit`

Evidence:

- `skills/openclaw-video-toolkit/SKILL.md` requires `--progress json` for cloud GPU tools.
- `tools/cloud_gpu.py` defines a progress reporter.
- Multiple long-running tools expose `--progress human|json`.

Implication for us:

- Add a standard `ProgressEvent` JSONL contract before more video/download/render operations become long-running.
- The current final JSON envelope is necessary, but not enough for agent-driven video work.

### `remotion-dev-skills`

Evidence:

- The Remotion skill decomposes guidance into small rule files.
- It recommends one-frame render checks with `npx remotion still`.
- It separates subtitle, ffmpeg, silence detection, audio visualization, and parameter rules.

Implication for us:

- Add a render still/screenshot review harness for cheap layout checks before full render.
- Split broad render/caption knowledge into smaller reusable rule docs only where they map to active code paths.

### `captacity`

Evidence:

- Handles local Whisper and OpenAI Whisper.
- Groups caption text by fit function and supports current-word highlighting.
- Has guard behavior for words too long for the frame.

Implication for us:

- Caption quality checks should include long-token fit risk.
- Our caption export direction is right; the next improvement is visual fit validation, not another caption format.

### `whisperX`

Evidence:

- Forced alignment creates word-level segments and interpolates missing timestamps.
- Supports VAD, diarization, speaker assignment, SRT/VTT, word highlighting, and progress callbacks.

Implication for us:

- For high-quality source clipping, we should eventually support an alignment provider beyond coarse ASR.
- Speaker labels would improve longform clip selection and crop decisions.

### `prompt-language`

Evidence:

- Architecture emphasizes immutable state, persisted state files, checksums, backups, and explicit session state.
- Documentation governance separates shipped behavior from roadmap/speculation.

Implication for us:

- Our new artifacts should be explicit contracts, not hidden state.
- State/resume behavior should be schema-driven and recoverable.

## Priority Recommendations

### Priority 1: Enrich `highlight-candidates.v1.json`

Current state: good first deterministic selector.

Next additions:

- Add `sourceDuration`.
- Add `selectionMethod`: `deterministic-v1`, later `deterministic-plus-llm-v1`.
- Add candidate `sourceSignals`:
  - `silenceBeforeSeconds`
  - `silenceAfterSeconds`
  - `internalSilenceSeconds`
  - `fillerOnlySegmentCount`
  - `audioEnergyScore`
  - `sceneChangeScore`
  - `llmNarrativeScore`
- Add candidate spacing/min-gap policy.
- Add `rejectionReasons` and `approvalNotes`.

Why: this brings our selector closer to `ViriaRevive` and `video-editing-skill` without pulling in expensive video analysis yet.

### Priority 2: Add `highlight-approval.v1.json`

Shape:

- `sourceCandidatesPath`
- `approvedCandidateIds`
- `rejectedCandidateIds`
- per-candidate notes
- selected render order
- approval actor and timestamp

Why: `yt-short-clipper` proves that separating highlight discovery from processing is useful. It lets us regenerate/approve clips before paying render costs.

### Priority 3: Add `boundary-snap` Runtime

Use transcript word timings to adjust start/end to:

- sentence-ending punctuation
- natural pauses
- safe min/max extension windows
- minimum retained duration

Why: `ViriaRevive` has a focused sentence-boundary algorithm. Our candidate selector should not own all boundary correction forever.

### Priority 4: Add `source-media-analyze` Metadata

First version should be cheap:

- duration
- dimensions
- fps
- audio presence
- rough orientation
- optional sampled frames
- optional audio energy by second
- optional scene-change density

Why: this unlocks better candidate scoring and visual readiness without starting with full YOLO/crop complexity.

### Priority 5: Add Media Index

Start with JSON only, but design for SQLite later:

- asset id
- path
- type/category
- duration
- dimensions/fps
- transcript path
- provider/license/source URL
- tags
- metadata
- fingerprint/checksum

Why: several of our existing skills mention cache/versioning/provenance, but there is no runtime index yet.

### Priority 6: Add Style Profile Library

Contracts:

- `style-profile.v1.json`
- `design-reference.v1.json`

Connect:

- `reverse-engineer-winner`
- `niche-profile-draft`
- caption preset selection
- visual prompt/style selection
- packaging metadata

Why: `video-podcast-maker` and `youtube-shorts-pipeline` both show that repeatable style memory is a quality multiplier.

### Priority 7: Add `ProgressEvent` JSONL

Minimum fields:

- `schemaVersion`
- `runId`
- `stage`
- `event`
- `percent`
- `message`
- `artifactPath`
- `warning`
- `timestamp`

Why: this is the operational contract needed before longer ASR, download, crop, render, and generation stages become frustrating to supervise.

## What Not To Do Yet

- Do not add YOLO/dynamic crop as the next step. It is valuable, but it should consume approved clip spans and source analysis.
- Do not add upload automation yet. Publish prep and metadata matter first.
- Do not replace deterministic candidate selection with an LLM-only selector. The better pattern is deterministic signal extraction plus optional LLM narrative judgment.
- Do not add more prose-only skills before adding runtime contracts for the skills already identified.

## Immediate Next Implementation Slice

Implement `highlight-approval.v1.json` and extend `longform-highlight-select` enough to carry explicit candidate rejection/approval metadata.

Rationale:

- It directly follows the `yt-short-clipper` two-phase pattern.
- It makes the new selector useful in real workflows before visual analysis exists.
- It creates a stable handoff to `boundary-snap`, clipping, reframe, and render.

After that, implement `source-media-analyze` for audio energy and scene-change signals, then feed those signals back into `highlight-candidates.v1.json`.
