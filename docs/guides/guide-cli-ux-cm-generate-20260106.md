# guide-cli-ux-cm-generate-20260106

UX review for `cm generate` (topic -> video). This is the "golden path" command for Persona A (creator-operator). It must also be reliable for Persona B (engineer-operator) in CI and scripts.

References: `docs/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants a video fast; expects "one command" success.
- Engineer-operator: wants deterministic behavior, stable output, and clear exit codes.
- Contributor/debugger: uses `--mock`, `--dry-run`, and artifact retention to reproduce issues.

## Job to be done

"Turn a topic into an upload-ready MP4, and tell me exactly where everything went."

## Current behavior (as implemented today)

- Prints a short header (topic/archetype/output), then uses sequential `ora` spinners: "Stage 1/4 ... Stage 4/4 ...".
- `--dry-run` prints planned configuration + a stage list.
- `--mock` uses a fake LLM provider and runs downstream stages in mock mode.
- Uses `runPipeline()` which defaults the work directory to `dirname(--output)`.
- Writes these files during a real run:
  - `audio.wav` and `timestamps.json` into the work directory
  - the final MP4 at `--output`
- `--keep-artifacts` prevents cleanup of intermediate files, but (as of 2026-01-06) does not guarantee `script.json` and `visuals.json` are written because those are not currently persisted during `generate`.

## What users will expect (and where we miss)

- Expectation: "keep artifacts" means _all_ intermediate artifacts exist and their paths are printed.
  - Reality: only audio and timestamps are guaranteed.
- Expectation: progress feels trustworthy and not "magic".
  - Reality: stage transitions depend on message substring matching.
- Expectation: it works in scripts.
  - Reality: root `--json` exists but `generate` does not provide a single machine-readable result object.

## Recommendations

### P0 (make the experience trustworthy)

- Make `--keep-artifacts` actually write `script.json` and `visuals.json` and print all artifact paths on success.
- Emit structured progress events from `runPipeline()` (stage + phase + percent) instead of parsing strings.
- Print an explicit "Artifacts directory: <path>" line early so users can find outputs mid-run.
- Add a clear next step on success: `cm validate <output>` (and optionally `cm render` re-run guidance).

### P1 (make it scriptable and debuggable)

- Implement `--json` output for the final result (schema versioned), including artifact paths, duration, dimensions, costs, and timings.
- Add `--workdir <dir>` (or `--artifacts-dir <dir>`) to decouple artifacts from `--output` location.
- Ensure `--verbose` increases detail consistently (and does not change stable stdout contracts).

### P2 (delighters, after correctness)

- Add `--open` (platform-specific) or print a safe "open folder" command snippet.
- Add a short "resume" story (e.g., if `audio.wav` exists, skip stage 2 unless forced).

## Ideal success output (ASCII sketch)

stderr:

```
content-machine
Topic: Redis vs PostgreSQL
Output: out/video.mp4
Artifacts: out/

[1/4] Script ... done (out/script.json)
[2/4] Audio  ... done (out/audio.wav, out/timestamps.json)
[3/4] Visuals... done (out/visuals.json)
[4/4] Render ... done (out/video.mp4)
Next: cm validate out/video.mp4 --profile portrait
```

stdout (when `--json`):

```
{"schemaVersion":1,"command":"generate","outputs":{"video":"out/video.mp4","script":"out/script.json", ...}}
```
