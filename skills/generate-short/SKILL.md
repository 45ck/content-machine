---
name: generate-short
description: Build a full short from brief to reviewed MP4 while keeping script, audio, visuals, captions, and validation aligned as one edit.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"topic":"Redis vs PostgreSQL for caching","archetype":"versus","outputDir":"output/content-machine/generate-short","render":{"fps":30,"downloadAssets":true},"publishPrep":{"enabled":true,"platform":"tiktok"}}'
entrypoint: node --import tsx scripts/harness/generate-short.ts
inputs:
  - name: topic
    description: Short-form video topic or brief.
    required: true
  - name: outputDir
    description: Directory that will receive the generated stage artifacts.
    required: false
  - name: archetype
    description: Optional script archetype such as story, listicle, versus, howto, or product-demo.
    required: false
  - name: laneId
    description: Optional visual/editing lane such as reddit-post-over-gameplay, stock-b-roll-explainer, or gameplay-confession-split.
    required: false
  - name: referenceVideoPath
    description: Optional reference short to reverse-engineer before generation.
    required: false
outputs:
  - name: script/script.json
    description: Generated script artifact.
  - name: audio/audio.wav
    description: Generated voiceover audio.
  - name: audio/timestamps.json
    description: Word and scene timing artifact.
  - name: visuals/visuals.json
    description: Visual plan for the render step.
  - name: visuals/visual-quality.json
    description: Metadata preflight report for visual readiness.
  - name: render/video.mp4
    description: Final rendered short.
  - name: render/captions.remotion.json
    description: Remotion-compatible caption export.
  - name: render/captions.srt
    description: Plain SRT caption sidecar.
  - name: render/captions.ass
    description: ASS karaoke-style caption sidecar.
  - name: quality-summary.json
    description: Combined visual and caption quality readiness summary.
---

# Generate Short

## Use When

- The user wants the default skills-first path from topic to video files
  in one call.
- Claude Code or Codex should hand back the full file set instead of
  manually coordinating each stage itself.
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
- Overall editorial judgment from
  [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md).
- Caption-treatment choice through
  [`short-form-captions`](../short-form-captions/SKILL.md).
- Final render and review gating.

## Workflow

1. Start with the brief, not the render flags.
2. Pick `laneId` separately from `archetype` when the brief implies a
   visual/editing lane. `archetype` is the script shape;
   `laneId` is the video format.
3. Generate a script with enough punch to support chunked reading.
4. Generate audio and timestamps cleanly enough that captions will not
   be forced to compensate.
5. Build visuals that leave caption room and avoid baked-in source text.
6. Choose the caption family before render.
7. Use
   [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
   when you need hook, pacing, visual-assembly, or rejection guidance
   instead of only stage execution.
8. Render.
9. Review. Reject bad outputs instead of rebranding them as acceptable.

## Optional Runtime Surface

- Repo-side runner when you want the package to execute the path
  directly:
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
- Writes quality sidecars when the default stage settings are used:
  `visuals/visual-quality.json`, `render/captions.remotion.json`,
  `render/captions.srt`, `render/captions.ass`, and
  `quality-summary.json`.
- The default review path should carry `render/captions.remotion.json`
  into `publish-prep` so the final MP4 is checked for actual rendered
  caption sync, not just for a valid caption plan on disk.
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
- `visuals/visual-quality.json` exists and reports whether metadata
  preflight passed.
- `render/video.mp4` and `render/render.json` exist.
- `render/captions.remotion.json`, `render/captions.srt`, and
  `render/captions.ass` exist when caption export is enabled.
- `quality-summary.json` exists and reports known visual and caption
  readiness signals.
- The caption treatment matches the script and platform instead of using
  a random default.
- If `publishPrep.enabled` is true, `publish-prep/` exists and reports a
  clear pass/fail outcome.
