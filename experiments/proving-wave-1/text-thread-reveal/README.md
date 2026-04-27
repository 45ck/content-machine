# Text Thread Reveal

This lane proves a minimal "message reveal" short inside the repo's
existing runtime without editing shared code.

Scope:

- keep all authored inputs and outputs inside this folder
- use repo harnesses for audio and render
- prefer a lane-true thread/message visual grammar over generic stock
  footage

Contents:

- [prompt.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/prompt.md)
  - lane intent and constraints
- [script/manual-script.json](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/script/manual-script.json)
  - hand-authored script used for the proving run
- [assets/](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/assets)
  - lane-local SVG message frames
- [requests/](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/requests)
  - JSON payloads for repo harnesses
- [report.md](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/report.md)
  - run log, exact paths, and honest outcome
- [tools/](/home/calvin/Documents/GitHub/content-machine/experiments/proving-wave-1/text-thread-reveal/tools)
  - lane-local helpers for the local-only fallback path

Planned runtime path:

1. `script/manual-script.json`
2. `scripts/harness/script-to-audio.ts`
3. lane-local `visuals/visuals.json`
4. `scripts/harness/video-render.ts`
