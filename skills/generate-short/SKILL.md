---
name: generate-short
description: Build a full short from brief to reviewed MP4 while keeping script, audio, visuals, captions, and validation aligned as one edit.
---

# Generate Short

## Use When

- The user wants the default skills-first path from topic to video files
  in one call.
- Claude Code or Codex should hand back the full file set instead of
  manually coordinating stage-level wrappers.
- A reference winner should be ingested first so script generation can
  inherit blueprint and archetype hints.
- The run should use the pack's built-in audio, captions, visuals,
  Remotion render, and publish review steps.
- Reference shorts are for `reverse-engineer-winner` style analysis.
  Do not feed already-captioned published shorts back in as raw visuals
  or gameplay.

## What This Skill Owns

- Brief-to-script fit for short-form pacing.
- Audio and timestamp generation that the caption system can actually
  use.
- Visual planning that respects caption space instead of fighting it.
- Caption-treatment choice through
  [`short-form-captions`](../short-form-captions/SKILL.md).
- Final render and review gating.

## Workflow

1. Start with the brief, not the render flags.
2. Generate a script with enough punch to support chunked reading.
3. Generate audio and timestamps cleanly enough that captions will not
   be forced to compensate.
4. Build visuals that leave caption room and avoid baked-in source text.
5. Choose the caption family before render.
6. Render.
7. Review. Reject bad outputs instead of rebranding them as acceptable.

## Technical Surface

- Full runtime entrypoint when you want repo-side execution from a
  coding-agent CLI:
  `node --import tsx scripts/harness/generate-short.ts`
- Supporting code:
  `src/harness/generate-short.ts`,
  `src/render/captions/*`,
  `src/visuals/*`,
  `src/validate/*`

## Output Contract

- Writes a bounded output tree under `outputDir`.
- If `referenceVideoPath` is supplied, writes ingest files under
  `outputDir/ingest` unless `referenceOutputDir` is overridden.
- `referenceVideoPath` is analyzed into blueprint/theme files. It is not
  treated as render-ready source footage.
- Always writes script, audio, timestamps, visuals, render metadata, and
  final video files.
- Runs `publish-prep` by default and writes its bundle unless
  `publishPrep.enabled` is `false`.
- Fails closed by default when the review bundle reports `passed: false`.
  Set `publishPrep.requirePass` to `false` only when you explicitly want
  files written even though the review gate failed.
- The point of the skill is the finished edit and review outcome, not
  just the fact that files were produced.

## Validation Checklist

- `script/script.json` exists and has at least one scene.
- `audio/audio.wav` and `audio/timestamps.json` exist and agree on
  duration.
- `visuals/visuals.json` exists and matches the timestamps file.
- `render/video.mp4` and `render/render.json` exist.
- The caption treatment matches the script and platform instead of using
  a random default.
- If `publishPrep.enabled` is true, `publish-prep/` exists and reports a
  clear pass/fail outcome.
