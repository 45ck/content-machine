---
name: longform-clip-extract
description: Extract approved longform highlight candidates into clip-local video, audio, timestamps, visuals, and clip-plan artifacts after selection, boundary snap, and approval.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"sourceMediaPath":"input/source.mp4","approvalPath":"runs/source-clips/longform-to-shorts/highlights/highlight-approval.v1.json","boundarySnapPath":"runs/source-clips/longform-to-shorts/highlights/boundary-snap.v1.json","timestampsPath":"input/source/timestamps.json","outputDir":"runs/source-clips/extracted"}'
entrypoint: node --import tsx scripts/harness/longform-clip-extract.ts
inputs:
  - name: sourceMediaPath
    description: Local source video or audio file to cut.
    required: true
  - name: approvalPath
    description: highlight-approval.v1.json with approved candidate ids.
    required: true
  - name: boundarySnapPath
    description: Optional boundary-snap.v1.json for snapped start/end times.
    required: false
  - name: timestampsPath
    description: Optional source timestamps artifact used to write clip-local timestamps.
    required: false
outputs:
  - name: clip.mp4
    description: Extracted approved source range for each approved candidate.
  - name: audio.wav
    description: Clip-local extracted audio for video-render.
  - name: timestamps.json
    description: Clip-local word timestamps shifted to start at zero.
  - name: visuals.json
    description: Clip-local user-footage visuals artifact for video-render.
  - name: clip-plan.json
    description: Per-candidate extraction plan and next-step handoff.
---

# Longform Clip Extract

## Use When

- `longform-to-shorts` has selected and approved one or more candidate
  clips.
- The next step needs actual local media files instead of only
  timestamp ranges.
- A harness needs render-ready `audioPath`, `timestampsPath`, and
  `visualsPath` inputs for an approved source excerpt.

## Workflow

1. Run `longform-to-shorts` first and review the candidate plan.
2. Rerun selection with `approvedCandidateIds` or otherwise produce
   `highlight-approval.v1.json`.
3. Call this skill with the source media, approval artifact, optional
   boundary snap, and source timestamps.
4. Use the returned per-candidate `clip-plan.json` to decide whether
   reframing is needed before `video-render`.

## Invocation

```bash
cat skills/longform-clip-extract/examples/request.json | \
  node --import tsx scripts/harness/longform-clip-extract.ts
```

Inside Claude Code, Codex CLI, Cursor, or another harness, prefer:

> Use Content Machine to extract the approved longform candidate into
> clip-local video, audio, timestamps, and visuals artifacts. Do not
> render until the clip plan confirms the source range and paths.

## Output Contract

For each approved candidate, writes:

- `clips/<candidate-id>/clip.mp4`
- `clips/<candidate-id>/audio.wav`
- `clips/<candidate-id>/timestamps.json` when source timestamps are
  provided
- `clips/<candidate-id>/visuals.json` when video extraction is enabled
- `clips/<candidate-id>/clip-plan.json`

## Validation Checklist

- Only approved candidates are extracted.
- Boundary-snap ranges are used when available.
- Extracted video and audio files are non-empty.
- Clip-local timestamps start at zero and stay within clip duration.
- `visuals.json` points at the extracted local clip as `user-footage`.
