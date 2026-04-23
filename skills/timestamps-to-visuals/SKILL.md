---
name: timestamps-to-visuals
description: Turn a timestamps artifact into a visuals.json plan so a harness can run the visuals stage behind a deterministic JSON boundary.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"timestampsPath":"output/harness/audio/timestamps.json","outputPath":"output/harness/visuals/visuals.json","provider":"pexels","orientation":"portrait"}'
entrypoint: node --import tsx scripts/harness/timestamps-to-visuals.ts
inputs:
  - name: timestampsPath
    description: Timestamps artifact that defines scene and word timing.
    required: true
  - name: outputPath
    description: Path that will receive the generated visuals.json artifact.
    required: false
  - name: provider
    description: Primary visual asset provider id.
    required: false
  - name: providers
    description: Optional explicit provider chain used instead of the single primary provider.
    required: false
  - name: orientation
    description: Orientation override such as portrait, landscape, or square.
    required: false
outputs:
  - name: visuals.json
    description: Per-scene visuals plan written to the requested output path.
---

# Timestamps To Visuals

## Use When

- The user already has `timestamps.json` and wants the deterministic
  visuals stage only.
- A harness needs a stable JSON-in/JSON-out boundary before render or
  media generation work.
- Claude Code or Codex should produce `visuals.json` instead of
  freeform shot suggestions.

## Invocation

```bash
cat skills/timestamps-to-visuals/examples/request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts
```

## Artifact Contract

- Reads an existing `timestamps.json` artifact without modifying it.
- Writes one `visuals.json` artifact to the requested `outputPath`.
- Provider selection comes from explicit `provider` / `providers`
  fields plus repo configuration, not ad hoc prompt interpretation.
- Returns a JSON envelope with the final visuals path and generated
  scene count.

## Validation Checklist

- `outputPath` exists and points to a valid `visuals.json` artifact.
- The visuals plan covers the scenes implied by `timestamps.json`.
- Each visual entry includes enough metadata for downstream render work.
