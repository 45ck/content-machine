# guide-cli-ux-cm-render-20260106

UX review for `cm render` (`visuals.json` + audio + timestamps -> `video.mp4`). This is the most resource-heavy step and the one most likely to produce "mysterious" failures if progress and logs are not clear.

References: `docs/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants the MP4 and does not care about Remotion internals.
- Engineer-operator: wants reproducible builds, explicit inputs, and a stable output contract.
- Contributor/debugger: wants bundle and render progress, plus actionable render errors.

## Job to be done

"Render an MP4 that matches platform specs and is ready for validation/upload."

## Current behavior (as implemented today)

- Spinner: "Rendering video...".
- Requires `--input` (visuals JSON) and `--audio`; reads `--timestamps` (default `timestamps.json`).
- Passes `--orientation` and `--fps` into `renderVideo()`.
- `renderVideo()` has measurable progress (bundling and rendering percent), but the CLI only shows a single spinner; detailed progress is currently only in logs.
- Prints a summary with duration, resolution, size, and output path.

## UX gaps (where users lose confidence)

- Long-running feel: without percent, bundle/render feels "stuck".
- Input clarity: users can easily point to mismatched `visuals.json` and `timestamps.json` without immediate validation.
- Machine output: no stable `--json` output for render results (path, size, dimensions, timings).

## Recommendations

### P0

- Surface bundling and rendering percent progress in TTY mode; disable spinners/percent in `--json` mode.
- Validate input JSON shapes and required files early (before starting Remotion bundle).
- Validate `--orientation` and `--fps` at the CLI boundary; return exit code 2 on invalid args.

### P1

- Add `--dry-run` to print resolved dimensions, fps, and which inputs will be read.
- Add `--json` output with `{outputPath, durationSeconds, width, height, fps, fileSizeBytes}` plus timings.

## Ideal failure output (ASCII sketch)

```
ERROR: Missing timestamps file: out/timestamps.json
Fix: run `cm audio -i out/script.json --timestamps out/timestamps.json` (or pass --timestamps <path>)
```
