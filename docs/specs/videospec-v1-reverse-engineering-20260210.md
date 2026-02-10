# VideoSpec v1 (Reverse-Engineering) (20260210)

This repo now supports extracting a structured reverse-engineering report from an input short-form video.

## Goals

- Extract a normalized timeline skeleton (shots + pacing).
- Extract editing metadata (primarily burned-in captions via OCR).
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

- Ingest: `ffprobe` for duration + resolution
- Shots: try PySceneDetect (Python), fall back to ffmpeg scene filter
- OCR: `tesseract.js` over a caption-friendly bottom crop
- ASR: `@remotion/install-whisper-cpp` (local Whisper.cpp) when installed; otherwise transcript is omitted
- Narrative: heuristic by default; optional LLM mode supported
- Entities: minimal v1 derives speaker IDs from transcript only (visual face/object detection is stubbed)

Every run records a `provenance.modules` map and optional notes describing fallbacks/omissions.

## CLI

See:

- `docs/reference/cm-videospec-reference-20260210.md`
