# Text Thread Reveal Report

Date: 2026-04-27

Run status: success with local-only fallback

## Goal

Produce one reviewable vertical MP4 inside this lane without depending
on external API providers.

## What I Tried

1. Repo audio harness attempt:
   `node --import tsx scripts/harness/script-to-audio.ts < requests/script-to-audio.request.json`
2. Repo render harness attempt:
   `node --import tsx scripts/harness/video-render.ts < requests/video-render.request.json`
3. Local-only fallback:
   - synthesize narration WAV with `ffmpeg` `flite`
   - build approximate `timestamps.json` from the manual script and real
     WAV duration
   - build lane-local `visuals.json` from SVG thread screens
   - assemble a final MP4 with direct `ffmpeg`

## Honest Outcome

- A real MP4 was produced and verified:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/text-thread-reveal-local.mp4`
- The successful path is fully local-only.
- The repo harness attempts did not produce the final reviewable output:
  - `script-to-audio` started but did not complete during the run window
  - `video-render` started Remotion/Chrome processes but produced no
    lane output file before I terminated that process tree

## Exact Output Paths

Successful final video:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/text-thread-reveal-local.mp4`

Supporting files used by the successful local-only render:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/audio/audio.wav`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/audio/timestamps.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/visuals/visuals.json`
- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render/images.ffconcat`

Partial artifact left by the interrupted repo audio path:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/audio/audio_16khz.wav`

Invalid partial video artifact left by the interrupted repo render path:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/output/render-ffmpeg/video-noaudio.mp4`
  - `ffprobe` failed with `moov atom not found`

## Verification

`ffprobe` on the final MP4 reported:

- duration: `30.810000`
- video: `h264`, `1080x1920`, `30/1`
- audio: `aac`
- size: `573019` bytes

## Limitations

- The successful audio is local `ffmpeg` `flite`, not Kokoro.
- The timestamps are approximate manual alignment derived from the final
  WAV duration, not Whisper output.
- The successful fallback MP4 does not include the repo caption export
  or a Remotion `render.json`.
- Visual motion is simple slideshow timing from lane-local SVGs rather
  than a richer template composition.
