# Showcase Content Machine Flow

## Purpose

One runnable self-demo flow for explaining Content Machine quickly:
problem, artifact-chain proof, skills/flows/runtime split, and a
reviewed MP4.

Use it when the goal is an OSS showcase clip, README/social preview, or
low-attention explainer for the repo.

## Primary Skill

- `generate-short`

The flow uses `generate-short` for current `run-flow` compatibility. The
3D/gameplay treatment is passed as visual context; a future dedicated 3D
harness can replace that part without changing the public flow name.

## Example Request

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "showcase-content-machine",
  "runId": "cm-showcase-3d-reddit-gameplay",
  "input": {
    "topic": "Product-demo short for Content Machine. Frame the hook as a Reddit post about opaque topic-to-video agents. Show repo-local skills and flows producing script, audio, timestamps, visuals, captions, render metadata, and publish-prep review as inspectable files. Use a caption-clean low-poly 3D runner or gameplay-like background. Avoid claims about guaranteed virality or perfect quality without review.",
    "archetype": "product-demo",
    "laneId": "reddit-post-over-gameplay",
    "targetDuration": 35,
    "audio": {
      "voice": "af_heart",
      "requireWhisper": false
    },
    "visuals": {
      "provider": "pexels",
      "orientation": "portrait",
      "topic": "developer terminal coding agent video editing workflow",
      "gameplay": {
        "clip": "runs/cm-showcase-3d-reddit-gameplay/assets/gameplay-3d-runner-1080x1920.mp4",
        "style": "low-poly-3d-runner",
        "required": false
      }
    },
    "render": {
      "fps": 30,
      "downloadAssets": true,
      "captionPreset": "capcut",
      "captionMode": "chunk"
    },
    "publishPrep": {
      "enabled": true,
      "platform": "tiktok",
      "requirePass": true,
      "validate": {
        "cadence": true,
        "audioSignal": true,
        "captionSync": true
      }
    }
  }
}
JSON
```

## Outputs

Expected run root:
`runs/cm-showcase-3d-reddit-gameplay/`.

Key artifacts:

- `script/script.json`
- `audio/audio.wav`
- `audio/timestamps.json`
- `visuals/visuals.json`
- `visuals/visual-quality.json`
- `render/video.mp4`
- `render/render.json`
- `render/captions.remotion.json`
- `publish-prep/validate.json`
- `publish-prep/score.json`
- `publish-prep/publish.json`

## Completion Gates

- The render exists and is portrait `1080x1920`.
- Caption sidecars exist when caption export is enabled.
- `publish-prep` passes or gives a concrete fix path.
- Demo source notes are added under `docs/demo/provenance` before the
  MP4 is linked from public docs.
- `npm run review:demo-videos` and `npm run public-demo:check` pass
  before promotion.

## Related Docs

- [`docs/user/examples/content-machine-self-demo.md`](../docs/user/examples/content-machine-self-demo.md)
- [`docs/user/showcase/README.md`](../docs/user/showcase/README.md)
- [`docs/demo/README.md`](../docs/demo/README.md)
- [`skills/procedural-gameplay-backgrounds`](../skills/procedural-gameplay-backgrounds/SKILL.md)
