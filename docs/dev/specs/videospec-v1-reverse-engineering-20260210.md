# VideoSpec v1 (Reverse-Engineering) (20260210)

This repo now supports extracting a structured reverse-engineering report from an input short-form video.

Engineering implementation details live in:

- `docs/dev/architecture/IMPL-VIDEOSPEC-ANALYZER-20260210.md`
  - Source PDF (imported): `docs/dev/specs/videospec-v1-integration-spec.pdf`

## Goals

- Extract a normalized timeline skeleton (shots + pacing).
- Extract editing metadata (primarily burned-in captions via OCR).
- Detect embedded screenshot/page segments (inserted content blocks) with best-effort OCR.
- Extract audio transcript (local-first Whisper.cpp when installed).
- Infer a narrative arc summary (hook -> escalation -> payoff).
- Emit a single versioned JSON artifact (`VideoSpec.v1`) with provenance notes.

## Schema

The canonical runtime contract is implemented as Zod:

- `src/videospec/schema.ts`

Top-level shape:

```ts
VideoSpecV1 = {
  meta,
  timeline,
  editing,
  audio,
  entities,
  narrative,
  provenance,
};
```

All times are seconds-from-start (`float`), timebase-normalized across modules.

## Implementation (v1)

`cm videospec` is implemented as a modular pipeline with fault-tolerant defaults:

- Ingest: local file path (or `http(s)` URL downloaded via `yt-dlp`), then `ffprobe` for duration + resolution
- Shots: try PySceneDetect (Python), fall back to ffmpeg scene filter
- OCR: `tesseract.js` over a caption-friendly bottom crop
- Inserted content blocks: heuristic detection (tile edge density + motion) + keyframe OCR, with best-effort region localization (PiP) and cached keyframe artifacts
- ASR: `@remotion/install-whisper-cpp` (local Whisper.cpp) when installed; otherwise transcript is omitted
- Narrative: heuristic by default; optional LLM mode supported
- Entities: minimal v1 derives speaker IDs from transcript only (visual face/object detection is stubbed)

Every run records a `provenance.modules` map and optional notes describing fallbacks/omissions.

## Design Notes

### Determinism

- Heuristic-only modules are deterministic given the same input file and tool versions.
- OCR/ASR outputs depend on their engines and may change across engine upgrades.
- LLM narrative mode runs at `temperature=0` but still depends on provider/model behavior; provenance records the provider/model.

### Caching

`cm videospec` caches module artifacts per input file (hash + size) under a cache root.

- default cache root: `.cache/content-machine/videospec` (relative to CWD)
- override: `--cache-dir` or `$CM_VIDEOSPEC_CACHE_DIR`
- disable: `--no-cache`

See `docs/dev/architecture/IMPL-VIDEOSPEC-ANALYZER-20260210.md` for the list of cache artifacts.

## CLI

See:

- `docs/reference/cm-videospec-reference-20260210.md`
