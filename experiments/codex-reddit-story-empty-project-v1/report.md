# Codex Reddit Story Empty Project v1

First run result before the local request templates were added:

- skill-pack install worked
- Codex discovered the shipped Reddit lane surfaces
- Codex stalled by over-inspecting `node_modules/@45ck/content-machine`
  instead of executing the lane
- no final outputs were produced

This experiment was then tightened with:

- `reference/asset-manifest.json`
- concrete request examples for Reddit opener, render, and review
- a stricter prompt boundary forbidding package-internal spelunking

Next run should be treated as the actual blackbox reproducibility check.

## Second Run Result

The tightened blackbox run was materially better:

- Codex stayed inside the local `reference/` contract
- Codex used the shipped skill pack rather than spelunking package
  internals
- Codex generated:
  - `outputs/work/script.json`
  - `outputs/work/reddit-assets/opener.png`
  - `outputs/work/reddit-assets/opener.svg`
  - `outputs/work/audio/audio.wav`
  - `outputs/work/audio/timestamps.json`
  - `outputs/work/audio/audio.json`
  - `outputs/work/visuals.json`
- Codex shortened the script after an initial overlong audio pass and
  got the narration down to about `49.78s`

What failed:

- the packaged `video-render` command started correctly against
  `SplitScreenGameplay`
- Chrome downloaded and the render began
- the packaged render then exited abnormally with no final
  `outputs/final/video.mp4`

So the current state is:

- the Reddit split-screen lane is reproducible through script, Reddit
  asset generation, audio, and visuals in a fresh project
- the packaged empty-project render path is still unstable and needs
  hardening before this counts as a fully autonomous Codex success

Follow-up tightening applied after this run:

- the prompt now explicitly pins package commands to Node `20.x`
- `reference/command-patterns.md` now records the required shell setup
