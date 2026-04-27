# Report

Status: completed with local-only fallback

## Outcome

A real playable MP4 was produced under this lane:

- Final video: `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/render-local/video.mp4`
- Duration: `29.935s`
- Video: `1080x1920`, `h264`, `30 fps`
- Size: `561340 bytes`

This final MP4 was created entirely from lane-local assets:

- five procedural scene clips under `assets/`
- one local narration WAV generated with `ffmpeg` `flite`
- one deterministic timestamps artifact generated inside the lane

## Commands Used

Doctor:

```bash
cat experiments/proving-wave-1/stock-b-roll-explainer/doctor-request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

Procedural scene assets:

```bash
bash experiments/proving-wave-1/stock-b-roll-explainer/make-procedural-assets.sh
```

Local narration WAV + timestamps:

```bash
node experiments/proving-wave-1/stock-b-roll-explainer/make-local-audio-and-timestamps.mjs
```

Manifest-driven visuals artifact:

```bash
cat experiments/proving-wave-1/stock-b-roll-explainer/timestamps-to-visuals.request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts
```

Final local render:

```bash
bash experiments/proving-wave-1/stock-b-roll-explainer/render-local.sh
```

## Exact Output Paths

Doctor:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/doctor/doctor.json`

Local-only run:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/audio/narration.txt`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/audio/audio.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/audio/timestamps.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/audio/audio.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/visuals/visuals.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/visuals/visual-quality.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/output/local-only-001/render-local/video.mp4`

Lane-local source clips:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/assets/scene-001.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/assets/scene-002.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/assets/scene-003.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/assets/scene-004.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/stock-b-roll-explainer/assets/scene-005.mp4`

## Honest Notes

- I kept the lane local-only after the refocus. No external provider was required for the final result.
- `script-to-audio.request.json` was attempted through the repo harness but did not produce lane-local artifacts in a reasonable window because the local Whisper path was already under heavy shared contention from another lane. I replaced it with `make-local-audio-and-timestamps.mjs`.
- `video-render.request.json` was also attempted through the repo harness, but it did not write a file under `output/local-only-001/render/` before shared Remotion capacity became the bottleneck. I stopped that lane-local render attempt and used `render-local.sh` to guarantee one reviewable MP4.
- The doctor report was `ok: true`, with warnings for Node `18.20.5` vs recommended `>= 20.6.0` and missing `yt-dlp`. Neither warning blocked the local-only final MP4.
