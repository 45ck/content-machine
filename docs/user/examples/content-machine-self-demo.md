# Content Machine Self-Demo Short

Status: `workflow`

Use this workflow to make a short that explains Content Machine with its
own runtime. It is intentionally proof-led: the edit should show
inspectable artifacts, not claim that the repo magically produces
publish-ready videos without review.

## Shape

- problem: most topic-to-video agents are opaque
- solution: Content Machine exposes skills, flows, and JSON-stdio
  harnesses
- proof: script, audio, timestamps, visuals, captions, render metadata,
  and publish-prep files appear on disk
- close: clone the repo, run diagnostics, then run `generate-short`

## Tracked Preview Variants

These previews are useful for quickly explaining the repo to low
attention-span viewers. They are deterministic no-key preview assets,
not golden benchmarks.

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.gif" alt="Content Machine Reddit gameplay remix preview" width="200" />
  </a>
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-19-content-machine-motion-cards.gif" alt="Content Machine motion card preview" width="200" />
  </a>
</p>

- [`demo-18`](../../demo/demo-18-content-machine-reddit-gameplay-remix.mp4)
  uses Reddit/gameplay packaging to explain the repo.
- [`demo-19`](../../demo/demo-19-content-machine-motion-cards.mp4) uses
  motion cards to explain the repo.
- Current demo-video review passes `demo-18` and flags only an
  informational caption-band-sparse note for `demo-19`; see
  [`experiments/video-quality-review-demo`](../../../experiments/video-quality-review-demo/README.md).
- Both still need publish-prep sidecars before being described as
  flagship examples.

## Run

Set at least `OPENAI_API_KEY` and one visual provider key such as
`PEXELS_API_KEY`, then run:

```bash
cat skills/generate-short/examples/content-machine-self-demo.request.json | \
  node --import tsx scripts/harness/generate-short.ts
```

The request writes to `runs/cm-self-demo-product/`.

Or run the flow wrapper when you want the self-demo treated as a
named showcase workflow:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "showcase-content-machine",
  "runId": "cm-showcase-3d-reddit-gameplay",
  "input": {
    "topic": "Product-demo short for Content Machine. Show skills, flows, JSON-stdio harnesses, generated artifacts, captions, render metadata, and publish-prep review as inspectable proof.",
    "archetype": "product-demo",
    "laneId": "reddit-post-over-gameplay",
    "targetDuration": 35,
    "publishPrep": {
      "enabled": true,
      "platform": "tiktok",
      "requirePass": true
    }
  }
}
JSON
```

Flow details:
[`flows/showcase-content-machine.md`](../../../flows/showcase-content-machine.md).

## No-Key Smoke Test

Use this when you want to prove the artifact chain without spending API
credits or waiting on provider limits. This produces mock audio, mock
visuals, caption sidecars, render metadata, and a placeholder MP4. It is
not a publishable demo.

Expect `visual-quality.json` and caption quality fields to report
failure in this mode because the smoke test deliberately uses fallback
placeholders instead of real footage and real narration.

```bash
cat <<'JSON' | node --import tsx scripts/harness/script-to-audio.ts
{
  "scriptPath": "fixtures/examples/content-machine-self-demo/script.json",
  "outputDir": "runs/cm-self-demo-smoke/audio",
  "mock": true
}
JSON

cat <<'JSON' | node --import tsx scripts/harness/timestamps-to-visuals.ts
{
  "timestampsPath": "runs/cm-self-demo-smoke/audio/timestamps.json",
  "outputPath": "runs/cm-self-demo-smoke/visuals/visuals.json",
  "visualQualityPath": "runs/cm-self-demo-smoke/visuals/visual-quality.json",
  "provider": "mock",
  "mock": true,
  "orientation": "portrait",
  "topic": "content machine agent workflow"
}
JSON

cat <<'JSON' | node --import tsx scripts/harness/video-render.ts
{
  "visualsPath": "runs/cm-self-demo-smoke/visuals/visuals.json",
  "timestampsPath": "runs/cm-self-demo-smoke/audio/timestamps.json",
  "audioPath": "runs/cm-self-demo-smoke/audio/audio.wav",
  "outputPath": "runs/cm-self-demo-smoke/render/video.mp4",
  "outputMetadataPath": "runs/cm-self-demo-smoke/render/render.json",
  "mock": true,
  "downloadAssets": false,
  "captionPreset": "capcut",
  "captionMode": "chunk"
}
JSON
```

## Inspect

- `runs/cm-self-demo-product/script/script.json`
- `runs/cm-self-demo-product/audio/audio.wav`
- `runs/cm-self-demo-product/audio/timestamps.json`
- `runs/cm-self-demo-product/visuals/visuals.json`
- `runs/cm-self-demo-product/render/video.mp4`
- `runs/cm-self-demo-product/render/render.json`
- `runs/cm-self-demo-product/quality-summary.json`
- `runs/cm-self-demo-product/publish-prep/validate.json`
- `runs/cm-self-demo-smoke/audio/audio.wav`
- `runs/cm-self-demo-smoke/audio/timestamps.json`
- `runs/cm-self-demo-smoke/visuals/visuals.json`
- `runs/cm-self-demo-smoke/visuals/visual-quality.json`
- `runs/cm-self-demo-smoke/render/video.mp4`
- `runs/cm-self-demo-smoke/render/render.json`
- `runs/cm-self-demo-smoke/render/captions.remotion.json`
- `runs/cm-self-demo-smoke/render/captions.srt`
- `runs/cm-self-demo-smoke/render/captions.ass`

## Promotion Rules

- Do not promote the MP4 unless `publish-prep` explains what passed and
  what failed.
- Replace generic stock footage with caption-clean terminal or artifact
  recordings before making it a flagship demo.
- Avoid claims about guaranteed virality, automatic upload, or perfect
  quality without human or agent review.
- Run `npm run review:demo-videos` before moving a finished MP4 into
  `docs/demo/`.
