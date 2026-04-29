# Subway Surfers Lane

Isolated Codex-style experiment for a high-quality "Subway Surfers with
captions" short using the repo's harness skills plus a local render
bridge.

## Goal

Produce a portrait short with:

- local Subway Surfers gameplay footage
- generated script, audio, timestamps, visuals, captions, and render
- all prompts, request payloads, logs, outputs, and quality reports
  stored under this directory only

## Chosen Path

1. `brief-to-script` skill
2. `script-to-audio` skill
3. `timestamps-to-visuals` skill
4. local `tools/render-split-screen.ts` bridge
5. `publish-prep-review` skill

The local bridge exists because the current `video-render` harness
contract does not expose the documented split-screen gameplay controls
needed for the Subway Surfers layout.

## Key Inputs

- Prompt: [prompts/topic.md](./prompts/topic.md)
- Gameplay clip:
  `/home/calvin/.cm/assets/gameplay/subway-surfers/Iot_bB8lKgE.mp4`
- Request payloads: [inputs](./inputs)
- Skill snapshots: [skill-pack](./skill-pack)
- Reference doc snapshot:
  [reference/split-screen-gameplay.md](./reference/split-screen-gameplay.md)

## Outputs

- Script: [artifacts/script/script.json](./artifacts/script/script.json)
- Audio: [artifacts/audio/audio.wav](./artifacts/audio/audio.wav)
- Timestamps: [artifacts/audio/timestamps.json](./artifacts/audio/timestamps.json)
- Visuals: [artifacts/visuals/visuals.json](./artifacts/visuals/visuals.json)
- Visual quality:
  [artifacts/visuals/visual-quality.json](./artifacts/visuals/visual-quality.json)
- Render:
  [artifacts/render/video.mp4](./artifacts/render/video.mp4)
- Final report:
  [reports/final-quality-report.md](./reports/final-quality-report.md)

## Re-run

Use [run.sh](./run.sh) from repo root.
