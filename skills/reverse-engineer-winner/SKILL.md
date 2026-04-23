---
name: reverse-engineer-winner
description: Analyze a reference video into VideoSpec, VideoTheme, blueprint, and frame-analysis artifacts so the harness can study what made it work.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"videoPath":"input/reference.mp4","outputDir":"output/harness/ingest"}'
entrypoint: node --import tsx scripts/harness/ingest.ts
inputs:
  - name: videoPath
    description: Local video path or supported URL to reverse-engineer.
    required: true
  - name: outputDir
    description: Directory that will receive the generated analysis artifacts.
    required: false
  - name: includeFrameAnalysis
    description: Whether to extract deterministic review frames alongside the structural artifacts.
    required: false
outputs:
  - name: videospec.v1.json
    description: Reverse-engineered VideoSpec artifact.
  - name: theme.v1.json
    description: High-level VideoTheme classification artifact.
  - name: blueprint.v1.json
    description: Reusable blueprint extracted from the source video.
---

# Reverse Engineer Winner

## Use When

- The user supplies a reference short and wants the repo to explain or
  reuse its structure.
- Claude Code or Codex needs a deterministic artifact chain before
  proposing new scripts or render changes.
- A harness wants review frames plus structural analysis in one call.

## Invocation

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/ingest.ts
```

## Artifact Contract

- Always writes `videospec.v1.json`.
- Optionally writes `theme.v1.json`, `blueprint.v1.json`, and
  `frame-analysis/frame-analysis.json`.
- Returns a JSON envelope with the main output directory and the artifact
  paths actually written.

## Validation Checklist

- `videospec.v1.json` exists and reports a non-zero shot count.
- If theme generation is enabled, the returned archetype is plausible.
- If blueprint generation is enabled, the blueprint file exists and can
  drive later script generation.
