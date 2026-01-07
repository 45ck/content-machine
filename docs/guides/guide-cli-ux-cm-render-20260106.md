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
- `renderVideo()` exposes bundling/rendering progress; the CLI surfaces this in TTY mode by updating spinner text with phase + percent, and in non-TTY mode prints coarse progress lines to stderr.
- Prints a summary with duration, resolution, size, and output path.

## UX gaps (where users lose confidence)

- Long-running feel: bundling vs rendering should be clearly distinguished (phase labels must stay stable).
- Input clarity: users can easily point to mismatched `visuals.json` and `timestamps.json` without immediate validation.
- Machine output: ensure `--json` stays a single envelope on stdout and stderr stays quiet.

## Recommendations

### P0

- Surface bundling and rendering percent progress in TTY mode; disable spinners/percent in `--json` mode. (Implemented)
- Validate input JSON shapes and required files early (before starting Remotion bundle).
- Validate `--orientation` and `--fps` at the CLI boundary; return exit code 2 on invalid args.

### P1

- Add `--dry-run` to print resolved dimensions, fps, and which inputs will be read.
- Add `--json` output with `{outputPath, durationSeconds, width, height, fps, fileSizeBytes}` plus timings. (Implemented)

## Ideal failure output (ASCII sketch)

```
ERROR: Missing timestamps file: out/timestamps.json
Fix: run `cm audio -i out/script.json --timestamps out/timestamps.json` (or pass --timestamps <path>)
```

## UX acceptance criteria

- Preflights required files and schema shapes before bundling Remotion.
- Shows bundling and rendering percent progress in TTY mode.
- Invalid `--orientation` / `--fps` fails fast with exit code 2 and actionable help.
- Success output includes output path, duration, dimensions, and file size.
