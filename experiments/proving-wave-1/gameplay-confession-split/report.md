# Proving Report

Date: `2026-04-27`

## Outcome

Status: `real MP4 produced`

Final video path:

- `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/video.mp4`

Final video facts:

- duration: `32.08s`
- resolution: `1080x1920`
- video codec: `h264`
- audio codec: `aac`
- size: `9,638,728 bytes`

## What Worked

This lane succeeded fully offline with local/procedural assets:

- top lane: five lane-local procedural support clips made with `ffmpeg`
- bottom lane: existing local gameplay clip at
  `/home/calvin/.cm/assets/gameplay/subway-surfers/Iot_bB8lKgE.mp4`
- narration: offline `ffmpeg` + `libflite`
- timestamps: lane-local synthetic alignment from the measured WAV
- captions: lane-local `ASS` + `SRT`
- final composition: direct local `ffmpeg` split-screen render

## Honest Runtime Results

Blocked or unreliable paths in this environment:

- external-provider paths were intentionally not used because the shell
  has no `OPENAI_API_KEY`, `PEXELS_API_KEY`, `GOOGLE_API_KEY`, or
  similar provider keys
- repo `script-to-audio.ts` with local `kokoro` started but stalled and
  produced no lane artifacts during the attempt
- repo `video-render.ts` started the Remotion/Chromium render path but
  produced no files under the lane render output after several minutes,
  so I killed it and used a local `ffmpeg` fallback to finish the lane

## Exact Artifact Paths

- script:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/script.json`
- narration text:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/narration.txt`
- support clips:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/assets/story-support/scene-001-freezer.mp4`
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/assets/story-support/scene-002-group-chat.mp4`
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/assets/story-support/scene-003-reply.mp4`
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/assets/story-support/scene-004-reveal.mp4`
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/assets/story-support/scene-005-judgment.mp4`
- audio wav:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/audio/audio.wav`
- audio metadata:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/audio/audio.json`
- timestamps:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/audio/timestamps.json`
- visuals:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/visuals/visuals.json`
- captions:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/captions.ass`
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/captions.srt`
- render metadata:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/render.json`
- final video:
  `/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/gameplay-confession-split/output/run-001/render/video.mp4`

## Assessment

This is reviewable and real, but it is still a proving artifact rather
than a polished lane:

- the top lane is procedural support footage, not stock or semantic
  footage selection
- timestamps are synthetic, so captions are structurally usable but not
  word-perfect
- the local fallback proved the lane shape and offline feasibility, but
  it did not prove that the repo's current Remotion render path is
  reliable in this shell
