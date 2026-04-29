# Codex Bread-and-Butter Blackbox v1

## Outcome

- Final video: `outputs/final/video.mp4`
- Review result: `publish-prep` passed
- Format: `1080x1920`, `h264/aac`
- Duration: `58.3s`

## What Happened

- A true black-box Codex CLI run was launched in this isolated project
  with the installed local skill pack.
- Codex spent too much time discovering request shapes and package
  surfaces, and did not autonomously complete the short in a useful
  amount of time.
- The project/runtime bug it surfaced around packaged validator script
  resolution was fixed at the repo level before the final manual
  completion pass.

## Completion Path Used

1. Wrote `outputs/work/script.json` manually in the isolated project.
2. Ran real local TTS through the installed skill-pack runner:
   `script-to-audio`
3. Built a local-video-only visuals plan and then switched to a
   deterministic FFmpeg assembly fallback after the packaged Remotion
   render path failed to produce an output file.
4. Burned captions from generated word timings.
5. Re-cut the visuals once to improve cadence.
6. Ran `publish-prep` until the final result passed.

## Final Notes

- This is a real isolated-project output using the installed local pack
  assets and runtime, not a placeholder render.
- The major remaining weakness of the black-box Codex experiment is not
  output validity; it is tool-friction and over-exploration before
  artifact production.
