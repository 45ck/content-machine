# Fast Facts Countdown Proving Lane

This lane is an isolated proving scaffold for a simple short-form format:
`fast-facts-countdown`.

Scope:

- keep all authored artifacts inside this folder
- use repo-local harness scripts instead of adding new runtime code
- attempt one reviewable MP4 render with exact, replayable request files

Planned path:

1. `doctor-report` for environment diagnostics
2. `script-to-audio` using a lane-local script in mock audio mode
3. `video-render` from a lane-local `visuals.local.json` artifact for a
   real portrait MP4 render

Key folders:

- `inputs/` - source script and deterministic local-manifest mapping
- `inputs/visuals.local.json` - local-only visual artifact used for the
  final render attempt
- `assets/` - lane-local SVG scene cards used as visuals
- `requests/` - exact JSON requests for each harness stage
- `outputs/` - generated artifacts from the run attempt
- `report.md` - honest results, including exact output paths and blockers

Repro commands from repo root:

```bash
node --import tsx scripts/harness/doctor-report.ts < experiments/proving-wave-1/fast-facts-countdown/requests/doctor.json
node --import tsx scripts/harness/script-to-audio.ts < experiments/proving-wave-1/fast-facts-countdown/requests/script-to-audio.json
node --import tsx scripts/harness/video-render.ts < experiments/proving-wave-1/fast-facts-countdown/requests/video-render.json
```

Note:

- `requests/timestamps-to-visuals.json` is kept as the originally
  attempted stage request, but it is not part of the final local-only
  path because that harness still triggers LLM-backed keyword extraction
  before applying the local manifest.
