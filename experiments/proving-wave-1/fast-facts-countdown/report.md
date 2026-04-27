# Fast Facts Countdown Report

Status: completed with one real local-only MP4

## Outcome

A real playable MP4 was rendered under this lane:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/video.mp4`

This final successful path was fully local-only:

- lane-authored script
- lane-authored SVG scene cards
- mock audio from the repo harness
- direct `video-render` harness against a checked-in local `visuals` artifact

No external stock provider, image provider, or LLM-backed visuals step was
used in the successful render.

## Exact Output Paths

Successful run (`run-002`):

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/audio/audio.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/audio/timestamps.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/audio/audio.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/video.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/render.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/captions.remotion.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/captions.srt`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render/captions.ass`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/publish-prep/validate.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/publish-prep/score.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/publish-prep/publish.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/publish-prep/caption-sync.json`

Diagnostics:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/doctor/doctor.json`

Additional observed lane-local render artifacts:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/audio/audio.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/audio/timestamps.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/audio/audio.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render/video.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render/render.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render/captions.remotion.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render/captions.srt`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render/captions.ass`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render-ffmpeg/video.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-001/render-ffmpeg/video-noaudio.mp4`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/fast-facts-countdown/outputs/run-002/render-local/video.mp4`

## What I Ran

From repo root:

```bash
node --import tsx scripts/harness/doctor-report.ts < experiments/proving-wave-1/fast-facts-countdown/requests/doctor.json
node --import tsx scripts/harness/script-to-audio.ts < experiments/proving-wave-1/fast-facts-countdown/requests/script-to-audio.json
node --import tsx scripts/harness/script-to-audio.ts < experiments/proving-wave-1/fast-facts-countdown/requests/script-to-audio-short.json
node --import tsx scripts/harness/video-render.ts < experiments/proving-wave-1/fast-facts-countdown/requests/video-render-short.json
node --import tsx scripts/harness/publish-prep.ts < experiments/proving-wave-1/fast-facts-countdown/requests/publish-prep-short.json
```

I also attempted:

```bash
node --import tsx scripts/harness/timestamps-to-visuals.ts < experiments/proving-wave-1/fast-facts-countdown/requests/timestamps-to-visuals.json
node --import tsx scripts/harness/video-render.ts < experiments/proving-wave-1/fast-facts-countdown/requests/video-render.json
```

Those attempted paths were not accepted as final outputs for this lane.

## Honest Results

`doctor-report`:

- top-level `ok: true`
- warnings:
  - Node.js `18.20.5` is below the repo's recommended `>= 20.6.0`
  - `yt-dlp` missing from `PATH`

Successful render (`run-002`):

- real MP4 exists
- `ffprobe` confirmed `1080x1920`, `h264` video, `aac` audio
- render metadata recorded `8.1s` duration and `4,757,788` byte size

Observed but not used as the final proof artifact:

- `run-001/render/video.mp4` exists and `render.json` reports a `26.4s`
  `1080x1920` `h264` render
- `ffprobe` returned metadata for that file, but it also emitted many
  H.264 decode warnings while probing
- because I did not perform a separate manual playback review and the
  shorter `run-002` path had the cleaner harness result for this lane, I
  am not treating `run-001/render/video.mp4` as the primary success
  claim

`publish-prep` result for `run-002`:

- bundle produced successfully
- overall `passed: false`
- main blockers from `validate.json`:
  - duration too short: `8.149333s`, below the validator's `30s` minimum
  - audio signal failed because mock audio is effectively silent
  - caption sync failed because `p95` start drift was `1146.6ms`, above the `900ms` threshold

Non-fatal runtime note:

- the successful `video-render` run printed a Remotion cleanup warning:
  `Protocol error (Page.bringToFront): Target closed`
- despite that warning, the harness returned `ok: true` and wrote the final MP4

## Blockers

Blocked local-only attempt:

- `timestamps-to-visuals` is not safe as a strict local-only stage in this repo state
- even with a deterministic local manifest, it entered LLM-backed keyword extraction and hit an OpenAI retry path before any local visuals artifact was written
- because of that, I bypassed the stage and authored a lane-local `visuals.short.local.json` for the successful render

Quality blockers still remaining on the final MP4:

- audio is mock-generated and silent enough to fail `audio-signal`
- the short proving cut is too short to pass publish validation
- caption timing is close but not within the stricter `p95` threshold used by publish prep
