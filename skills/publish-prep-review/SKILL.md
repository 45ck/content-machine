---
name: publish-prep-review
description: Score the script, validate the rendered video, and produce publish metadata so the agent can decide whether a short is ready to upload.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"videoPath":"output/video.mp4","scriptPath":"output/script.json","outputDir":"output/content-machine/publish-prep","platform":"tiktok","validate":{"profile":"portrait","cadence":true,"audioSignal":true}}'
entrypoint: node --import tsx scripts/harness/publish-prep.ts
inputs:
  - name: videoPath
    description: Rendered MP4 to validate.
    required: true
  - name: scriptPath
    description: Script file that produced the render.
    required: true
  - name: platform
    description: Target upload platform.
    required: false
outputs:
  - name: validate.json
    description: Video validation report for the final MP4.
  - name: score.json
    description: Deterministic script quality and safety score.
  - name: publish.json
    description: Upload metadata and checklist.
---

# Publish Prep Review

## Use When

- The user asks whether a render is ready to post.
- The agent needs a deterministic pass/fail bundle before human review.
- Claude Code or Codex needs upload metadata plus validation in one
  bounded step.

## Invocation

```bash
cat skills/publish-prep-review/examples/request.json | \
  node --import tsx scripts/harness/publish-prep.ts
```

## Output Contract

- Writes `validate.json`, `score.json`, and `publish.json` under the
  requested `outputDir`.
- Optionally writes `packaging.json` if packaging generation is enabled.
- Validation can include cadence, visual quality, temporal quality,
  audio signal, freeze detection, and flow consistency checks in
  addition to the base format/resolution/duration checks.
- This step reviews the final render. It does not retroactively make
  already-captioned source footage acceptable; source-text hygiene
  belongs in the visuals selection step.
- Returns a JSON envelope with a top-level `passed` boolean that combines
  validation and scoring.

## Validation Checklist

- `validate.json` exists and `passed` is true.
- `score.json` exists and `passed` is true.
- `publish.json` exists and includes a checklist and description.
