# guide-cli-ux-cm-visuals-20260106

UX review for `cm visuals` (timestamps -> `visuals.json`). This is where network and provider quirks show up; UX must prioritize transparency and recovery.

References: `docs/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants "good enough visuals" without caring about provider mechanics.
- Engineer-operator: wants reproducibility (same queries yield similar results) and clear API-key failures.
- Contributor/debugger: wants to see what was searched and why a fallback was used.

## Job to be done

"Given timestamps, pick visuals per scene and produce a `visuals.json` I can render."

## Current behavior (as implemented today)

- Spinner: "Finding matching visuals...".
- Reads `timestamps.json` (the `TimestampsOutput` produced by `cm audio`).
- Calls `matchVisuals()` and writes `visuals.json`.
- In TTY mode, updates spinner text with phase + percent; in non-TTY mode prints coarse progress lines to stderr.
- Prints a summary: number of scenes, total duration, number from stock, number of fallbacks.

## UX gaps (what causes confusion)

- Input mismatch risk: users often try to pass `script.json` when the command actually wants `timestamps.json`. Help text should be more explicit and include examples.
- Provider validation: `--provider` is free-form; invalid values fail late.
- Debuggability: when stock results are poor or missing, users need to know what query terms were used and how many results were returned.

## Recommendations

### P0

- Validate `--provider` at the CLI boundary and show allowed values in the error message.
- Add explicit examples in help and docs:
  - "Input is timestamps.json from `cm audio`"
- On missing API key, print:
  - "ERROR: Missing PEXELS_API_KEY"
  - "Fix: set PEXELS_API_KEY in .env or your environment"

### P1

- Add a `--dry-run` mode to print planned search terms/provider without making API calls.
- In `--verbose` mode, print per-scene search: query, hits, chosen asset, and fallback reason.

## Ideal success output (ASCII sketch)

```
Visuals matched
Scenes: 5
Output: out/visuals.json
Next: cm render -i out/visuals.json --audio out/audio.wav --timestamps out/timestamps.json -o out/video.mp4
```

## UX acceptance criteria

- Passing `script.json` as `--input` yields a clear, early error that points to `timestamps.json` from `cm audio`.
- Invalid `--provider` fails fast with exit code 2 and lists allowed providers.
- Missing provider credentials (e.g., `PEXELS_API_KEY`) yields a clear "Fix:" line.
