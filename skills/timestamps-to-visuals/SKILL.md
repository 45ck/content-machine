---
name: timestamps-to-visuals
description: Turn timestamps into a `visuals.json` plan so the video stack can pick stock footage, gameplay, local media, or generated shots.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"timestampsPath":"output/content-machine/audio/timestamps.json","outputPath":"output/content-machine/visuals/visuals.json","provider":"pexels","orientation":"portrait"}'
entrypoint: node --import tsx scripts/harness/timestamps-to-visuals.ts
inputs:
  - name: timestampsPath
    description: Timing file that defines scene and word timing.
    required: true
  - name: outputPath
    description: Path that will receive the generated visuals.json file.
    required: false
  - name: provider
    description: Primary visual provider id.
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

- The user already has `timestamps.json` and wants the visuals step
  only.
- The agent needs a stable step before render or media generation work.
- Claude Code or Codex should produce `visuals.json` instead of
  freeform shot suggestions.
- The agent needs to route clean local footage, stock, gameplay, or
  generated shots into the render plan without sneaking already-captioned
  shorts into `visuals.json`.

## Invocation

```bash
cat skills/timestamps-to-visuals/examples/request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts
```

## Output Contract

- Reads an existing `timestamps.json` file without modifying it.
- Writes one `visuals.json` file to the requested `outputPath`.
- Provider selection comes from explicit `provider` / `providers`
  fields plus repo configuration, not ad hoc prompt interpretation.
- Local footage and gameplay are expected to be caption-clean raw media.
  If the only source is an already-published short, treat it as a
  `reverse-engineer-winner` input instead of reusing it as visual stock.
- Returns a JSON envelope with the final visuals path and generated
  scene count.

## Validation Checklist

- `outputPath` exists and points to a valid `visuals.json` file.
- The visuals plan covers the scenes implied by `timestamps.json`.
- Each visual entry includes enough metadata for downstream render work.
- Any local video assets are free of persistent burned-in source text.
