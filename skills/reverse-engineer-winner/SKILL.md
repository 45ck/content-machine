---
name: reverse-engineer-winner
description: Analyze a reference short from a local file or URL into reusable breakdown files so an agent can study what made it work.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"videoPath":"input/reference.mp4","outputDir":"output/content-machine/ingest"}'
entrypoint: node --import tsx scripts/harness/ingest.ts
inputs:
  - name: videoPath
    description: Local video path or supported URL to reverse-engineer.
    required: true
  - name: outputDir
    description: Directory that will receive the generated breakdown files.
    required: false
  - name: includeFrameAnalysis
    description: Whether to extract review frames alongside the structural breakdown.
    required: false
outputs:
  - name: videospec.v1.json
    description: Reverse-engineered video breakdown.
  - name: theme.v1.json
    description: High-level classification file.
  - name: blueprint.v1.json
    description: Reusable blueprint extracted from the source video.
---

# Reverse Engineer Winner

## Use When

- The user supplies a reference short and wants the repo to explain or
  reuse its structure.
- Claude Code or Codex needs a deterministic breakdown before proposing
  new scripts or render changes.
- The agent wants review frames plus structural analysis in one call.

## Invocation

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/ingest.ts
```

Pass a local file path or a supported URL. URL inputs are downloaded
with `yt-dlp` before the repo runs the video analysis steps.

## Output Contract

- Always writes `videospec.v1.json`.
- Optionally writes `theme.v1.json`, `blueprint.v1.json`, and
  `frame-analysis/frame-analysis.json`.
- Returns a JSON envelope with the main output directory and the paths
  actually written.

## Validation Checklist

- `videospec.v1.json` exists and reports a non-zero shot count.
- If theme generation is enabled, the returned archetype is plausible.
- If blueprint generation is enabled, the blueprint file exists and can
  drive later script generation.
