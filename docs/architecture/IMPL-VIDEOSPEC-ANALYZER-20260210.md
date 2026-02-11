# IMPL: VideoSpec v1 Analyzer (20260210)

This document describes the engineering implementation of the **VideoSpec v1 Analyzer**: the code behind `cm videospec`.

If you want the CLI usage surface, see `docs/reference/cm-videospec-reference-20260210.md`. If you want the schema/contract, see `src/videospec/schema.ts` and `docs/specs/videospec-v1-reverse-engineering-20260210.md`.

## Scope

The analyzer is a **best-effort** reverse-engineering pipeline for an existing short-form video (TikTok/Reels/Shorts). It produces a single versioned JSON artifact, `VideoSpec.v1`, intended for:

- structural analysis (shots + pacing)
- burned-in text extraction (OCR)
- transcript extraction (ASR) when local Whisper is available
- coarse narrative labeling (heuristic by default, optional LLM)
- basic editing/audio heuristics (jump cuts, camera motion, beat grid, SFX onsets)

Non-goals (v1):

- frame-accurate VFX detection
- robust face/object tracking (entities.objects is intentionally empty)
- hard guarantees that every module runs (modules can be omitted with provenance recorded)

## Inputs And Outputs

**Input:** a local video file path (`mp4/webm/mkv`) passed to `analyzeVideoToVideoSpecV1()` via `cm videospec -i`.

`cm videospec` also accepts `http(s)` URL inputs (YouTube Shorts/Reels/etc). URL inputs are downloaded via `yt-dlp` to a local mp4 before analysis, and `provenance.modules.video_ingestion` records how ingestion happened (file vs yt-dlp, cache-hit vs tmp).

**Output:** a single JSON file conforming to `VideoSpec.v1`.

Top-level shape (conceptual):

```ts
VideoSpecV1 = {
  meta, // input-derived metadata + analysis timestamp + notes
  timeline, // shots + pacing
  editing, // OCR captions/overlays + effects heuristics
  audio, // transcript + audio-structure heuristics
  entities, // minimal characters derived from transcript
  narrative, // hook/escalation/payoff labeling
  provenance, // module-by-module engine labels + fallbacks
};
```

Timebase invariants:

- All times are **seconds-from-start** (`float`) and clamped to `[0, duration]`.
- `meta.duration` may be less than the full file duration when `--max-seconds` is used.

## Execution Model

Entry point:

- `src/videospec/analyze.ts`: `analyzeVideoToVideoSpecV1(options)`

The pipeline is intentionally **modular**. Each module:

- reads a shared `AnalyzeContext` (paths, duration, fps, cache dir)
- emits structured outputs
- writes `provenance.modules[<key>]` as one of:
  - a concrete engine label (example: `ffmpeg select(scene>0.35)`)
  - `cache`, `disabled`, `unavailable`, or `no-audio`
- appends to `provenanceNotes` on fallbacks/limitations

Fault tolerance policy:

- If a module is optional (OCR/ASR/LLM narrative), failures do not fail the entire run; the module is omitted and provenance notes explain why.
- If a required probe fails (example: cannot `ffprobe` the input), the run fails with an actionable error.

## Dependencies And Fallbacks

Hard dependencies (required for a useful run):

- `ffprobe`: duration/resolution probing
- `ffmpeg`: frame extraction (OCR, motion/effects heuristics) and audio extraction (ASR + audio structure)

Optional dependencies (best-effort):

- Python + `PySceneDetect`: higher quality shot boundary detection (preferred when available)
- Local Whisper.cpp assets: transcript extraction via `transcribeAudio(..., requireWhisper: false)`
- Network + API keys: only when `--narrative llm` is used

Fallback behavior:

- Shot detection: prefer PySceneDetect when requested/available, else fall back to ffmpeg scene filter.
- ASR: if whisper is unavailable or fails, transcript is omitted.
- Narrative: if LLM mode fails, fall back to heuristic narrative inference.

## Caching And Reproducibility

Cache root:

- default: `.cache/content-machine/videospec` (relative to CWD)
- override with `--cache-dir` or `$CM_VIDEOSPEC_CACHE_DIR`

Per-video cache directory:

- key = `sha256(inputFile)[:16] + "-" + file_size_bytes`
- this intentionally invalidates cache when the file changes or is replaced

Atomic writes:

- cache artifacts are written via an atomic-ish `writeJsonAtomic()` helper (temp file then `rename`)

Known cache artifacts (v1):

- `shots.v1.json`: shot cut times (seconds)
- `audio.transcript.v1.json`: transcript segments
- `editing.ocr.<fps>fps.v1.json`: grouped OCR segments at a given FPS
- `editing.effects.v1.json`: camera motion classifications + jump cut shot IDs
- `inserted-content.v1.json`: inserted content blocks cache (versioned wrapper with `{ version, blocks }`)
- `inserted-content/`: inserted-content keyframe artifacts (full frames + crops) when enabled
- `audio.structure.v1.json`: beat grid + SFX onsets + inferred music segments

### Provenance Modules (Keys)

The output always includes `provenance.modules`. These keys are stable and intended for debugging/automation:

- `pipeline`: analyzer identity and VideoSpec version string
- `shot_detection`: which shot detection engine produced cuts
- `ocr`: pass 1 OCR engine label, or `disabled|unavailable|cache`
- `ocr_refine`: pass 2 OCR engine label when `--pass both` is used
- `asr`: transcript engine label, or `disabled|unavailable|cache`
- `camera_motion`: heuristic engine label, or `cache|unavailable`
- `jump_cut_detection`: heuristic engine label, or `cache|unavailable`
- `music_detection`: heuristic label, or `cache|no-audio`
- `beat_tracking`: heuristic label, or `cache|no-audio`
- `sfx_detection`: heuristic label, or `cache|no-audio`
- `narrative_analysis`: `heuristic`, an LLM label, or `disabled`
- `inserted_content_blocks`: inserted-content detection/extraction label, or `cache|disabled|unavailable`

Reproducibility notes:

- Most heuristics are deterministic given the same input file and tool versions.
- OCR and ASR depend on their engines and may change across engine version changes.
- LLM narrative mode is configured with `temperature=0`, but still depends on upstream model behavior; provenance records which provider/model was used.

## Module Details

### Ingest (Probe)

- `probeVideoWithFfprobe()` provides duration and resolution.
- frame rate is probed separately (best-effort).
- `--max-seconds` clamps `meta.duration` and limits downstream work where supported.

### Timeline (Shot Detection + Pacing)

Primary output:

- `timeline.shots[]`: contiguous, non-overlapping `[start, end]` ranges
- `timeline.pacing`: shot count + summary stats + a coarse classification

Shot detection engines:

- PySceneDetect: `detectSceneCutsWithPySceneDetect(...)`
- Fallback: `ffmpeg` scene filter + `showinfo` to capture `pts_time`

### Editing: OCR (Captions + Overlays)

Core mechanics:

- frames are sampled at `--ocr-fps` (default differs by pass) and cropped to a bottom region
- Tesseract.js extracts text per frame
- frames are grouped into segments across time

Pass behavior:

- pass `1`: fast OCR sampling (default 1 FPS)
- pass `2`: refine OCR sampling (default 2 FPS)
- pass `both`: run refine and prefer refine output when it yields any segments

Classification:

- segments are heuristically split into `editing.captions[]` vs `editing.text_overlays[]`
- fuzzy transcript alignment is used to infer `caption.speaker` when possible

### Editing: Inserted Content Blocks (Screenshots/Pages)

This module detects and extracts embedded "inserted" assets composited into the video (for example: a Reddit post card overlay, a chat screenshot, or a browser page shown full-screen).

Current v1 behavior:

- Detection: downsampled grayscale samples are scored using **tile-based edge density + low motion** so picture-in-picture inserts can be detected even when the background moves.
- Segmentation: consecutive "screen-like" samples are grouped into `[start, end]` time ranges (seconds).
- Region localization: keyframes are OCRed full-frame; high-confidence word bboxes are unioned/padded to infer `region` and `presentation` (`full_screen|picture_in_picture`).
- Extraction: the inferred region is cropped and OCRed again to avoid mixing background/captions into extracted text.
- Artifacts: keyframe images are written under the per-video cache directory:
  - `inserted-content/<icb_id>/kfN.full.png`
  - `inserted-content/<icb_id>/kfN.crop.png`
    These are referenced in `inserted_content_blocks[].keyframes[].path` and `.crop_path` (relative to the per-video cache dir).
- Output: blocks are emitted as `inserted_content_blocks[]` with:
  - time range + `region`
  - keyframe OCR text and optional word-level bboxes
  - a best-effort `type` guess (`reddit_screenshot|browser_page|chat_screenshot|generic_screenshot`)

Limitations (v1):

- Still heuristic (no ML classifier yet); noisy OCR can reduce type confidence.
- Does not yet detect split-screen/multiple regions, nor perspective transforms/homography.

### Editing: Effects (Camera Motion + Jump Cuts)

This module is explicitly heuristic and bounded for performance.

- **Camera motion**: compare a start/end grayscale frame per shot and classify as `static|pan_left|pan_right|tilt|zoom_in|zoom_out|unknown` with a confidence score.
- **Jump cuts**: compare perceptual hashes across shot boundary frames; if a cut is "too similar", mark the following shot as `jump_cut: true` and record it in `editing.other_effects.jump_cuts`.

Performance guard:

- effects analysis is limited to the first 200 shots and records a provenance note when truncated.

### Audio: Transcript (ASR)

- audio is extracted to WAV (16kHz mono) and transcribed when ASR is enabled
- transcript is normalized into `audio.transcript[]` segments
- failure is non-fatal; output is an empty transcript with provenance notes

### Audio: Structure (Beat Grid + SFX + Music Segments)

Best-effort audio heuristics:

- `probeHasAudioStream()` checks if any audio stream exists
- PCM is extracted (mono signed 16-bit) and scanned for energy onsets
- output:
  - `audio.beat_grid`: optional `bpm` and a list of beat timestamps
  - `audio.sound_effects[]`: onset timestamps + heuristic type/confidence
  - `audio.music_segments[]`: coarse background music segments inferred from beat presence/energy patterns

If there is no audio stream:

- `music_segments=[]`, `sound_effects=[]`, `beat_grid={ bpm:null, beats:[] }`
- provenance modules use `no-audio`

### Entities (Characters)

v1 entities are intentionally minimal:

- `entities.characters[]` is derived from transcript speaker IDs
- `entities.objects[]` is empty (reserved for future CV-based detection)

### Narrative

Two modes:

- `heuristic` (default): uses shots + transcript + OCR text to infer hook/escalation/payoff arcs
- `llm`: uses configured LLM provider (temperature 0, JSON mode) and falls back to heuristic on failure

`off`:

- disables narrative analysis and emits a stable placeholder arc (the `narrative` key is required by the v1 schema)

## Extension Guide (How To Add A New Module)

Checklist:

- Update schema (and version if the contract changes): `src/videospec/schema.ts`
- Implement module in `src/videospec/analyze.ts`:
  - include caching under `ctx.videoCacheDir`
  - write a stable `provenance.modules.<key>`
  - add explicit failure handling: non-fatal where reasonable
- Add unit tests:
  - pure logic: `src/videospec/features.test.ts`
  - end-to-end analyzer behavior: `src/videospec/analyze.test.ts`
- Update docs:
  - `docs/specs/videospec-v1-reverse-engineering-20260210.md`
  - `docs/reference/cm-videospec-reference-20260210.md`

## Known Limitations (v1)

- OCR quality varies heavily with font, outline, motion blur, and background.
- Jump cut detection is a heuristic based on perceptual similarity; it will have false positives/negatives.
- Camera motion classification is coarse and does not model complex motion (handheld shake, rotation, digital stabilization artifacts).
- Music/SFX inference is energy/onset-based and not a genre-aware classifier.
- No face/object detection or tracking is performed.
