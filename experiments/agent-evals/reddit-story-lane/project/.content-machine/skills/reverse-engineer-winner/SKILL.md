---
name: reverse-engineer-winner
description: Analyze a reference short from a local file or URL into reusable breakdown files so an agent can study what made it work.
---

# Reverse Engineer Winner

## Use When

- The user supplies a reference short and wants the repo to explain or
  reuse its structure.
- Claude Code or Codex needs a grounded breakdown before proposing new
  scripts or render changes.
- The agent wants review frames plus structural analysis in one call.
- The input short is already captioned or fully edited and should be
  treated as a winner/reference, not as raw footage for `video-render`.

## What This Skill Owns

- Learning from existing winners without contaminating the render path.
- Breaking a finished short into reusable structure, pacing, and theme.
- Extracting the pieces the repo can reuse: `videospec`, `theme`, and
  `blueprint`.

## Core Approach

1. Treat the reference as evidence, not source material.
2. Study pacing, scene shape, caption behavior, and narrative structure.
3. Preserve what made the short work without copying surface details
   blindly.
4. Feed the reusable structure back into script, caption, and visual
   decisions instead of dropping the original MP4 into a new render.

Pass a local file path or a supported URL. URL inputs are downloaded
with `yt-dlp` before the repo runs the video analysis steps.

This skill is the correct home for already-published shorts. If a clip
already has captions, baked text, or finished edit treatment, ingest it
here and reuse the resulting blueprint/theme files rather than dropping
the MP4 into the visuals/render path.

## Outputs

- `videospec.v1.json`
- optional `theme.v1.json`
- optional `blueprint.v1.json`
- optional frame-analysis outputs

## Output Contract

- Always writes `videospec.v1.json`.
- Optionally writes `theme.v1.json`, `blueprint.v1.json`, and
  `frame-analysis/frame-analysis.json`.
- The point is reusable understanding, not a downloaded clip archive.

## Optional Runtime Surface

- Repo-side runner:
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs ingest`
- Supporting code:
  `src/harness/ingest.ts`,
  `src/videospec/*`,
  `src/videointel/*`

## Validation Checklist

- `videospec.v1.json` exists and reports a non-zero shot count.
- If theme generation is enabled, the returned archetype is plausible.
- If blueprint generation is enabled, the blueprint file exists and can
  drive later script generation.
- The result is being reused as structure, not as raw footage.
