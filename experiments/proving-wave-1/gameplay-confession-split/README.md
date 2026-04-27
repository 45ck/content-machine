# Gameplay Confession Split

Proving lane for a confession/storytime short with:

- story support clips on the top half
- gameplay on the bottom half
- midpoint captions

This lane is scoped to local-first proving. It avoids hidden dependencies
 and keeps every prompt, request, generated asset, and report under this
 folder.

## Goal

Produce one honest, reviewable `1080x1920` MP4 with the repo runtime if
 the environment allows it.

## Runtime Reality

- Local gameplay footage is available under `~/.cm/assets/gameplay/`
- `ffmpeg` is available for lane-local support clips
- External LLM and stock keys were missing during this proving run, so
  the fully automatic `generate-short` path was not expected to succeed

## Lane Files

- `prompt.md` - exact lane brief
- `script.json` - hand-authored confession script used for the local run
- `requests/` - runnable JSON requests for the repo harness tools
- `assets/story-support/` - lane-local top-lane support clips
- `output/` - generated audio, visuals, render, and attempt logs
- `report.md` - honest results and exact artifact paths

## Primary Commands

```bash
node --import tsx scripts/harness/script-to-audio.ts < \
  experiments/proving-wave-1/gameplay-confession-split/requests/script-to-audio.json

node --import tsx scripts/harness/video-render.ts < \
  experiments/proving-wave-1/gameplay-confession-split/requests/video-render.json
```
