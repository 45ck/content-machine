# guide-cli-ux-cm-research-20260106

UX review for `cm research` (query → `research.json`). References `docs/guides/guide-cli-ux-standards-20260106.md`.

## Current UX (observed)

- Validates sources (filters invalid values silently), then searches sources via the orchestrator.
- Uses a spinner and prints a short summary (sources, evidence count, suggested angles, errors, output, timing).
- Supports `--dry-run`, `--sequential`, `--mock` (for angle generation).

## UX gaps / risks

- Invalid sources are silently dropped; user may think a source ran when it didn’t.
- `--no-angles` is present, but the summary prints “Generate angles: …” using the commander boolean inversion, which can be confusing.
- Root `--json` exists but command output is mixed (file + summary).

## Improvements (proposed)

- Fail fast (exit `2`) if any specified source is invalid; or print an explicit “ignored sources” list.
- Add a progress line per source (start/end, result count, latency) for better visibility.
- Add `--json` output to stdout with a stable schema including errors and timings.
- Add `--cache` / `--no-cache` if sources support caching; surface cache hits/misses in verbose mode.
