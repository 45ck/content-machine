# guide-cli-ux-cm-render-20260106

UX review for `cm render` (visuals + timestamps + audio → `video.mp4`). References `docs/guides/guide-cli-ux-standards-20260106.md`.

## Current UX (observed)

- Uses an `ora` spinner (“Rendering video…”).
- Reads `--input` visuals JSON and `--timestamps` (defaults to `timestamps.json`), and requires `--audio`.
- Calls `renderVideo()` which bundles Remotion + renders media; detailed progress exists only in logs.
- Prints a summary (duration, resolution, file size, output).

## UX gaps / risks

- Long operations (bundle + render) only show a single spinner; percent progress is available but not surfaced.
- `--orientation` is not validated against the shared `OrientationEnum` at the CLI boundary.
- No `--json` output mode for render result (size, duration, resolution, output path).

## Improvements (proposed)

- Surface bundling/rendering percent progress to the CLI (and disable it in non‑TTY/`--json` mode).
- Validate `--orientation` and `--fps` using Commander coercion and enum parsing; return exit code `2` on bad args.
- Add `--json` output and print artifact paths consistently.
- Add a `--dry-run` mode to show resolved dimensions/fps and all required inputs before doing work.
