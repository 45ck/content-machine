# guide-cli-ux-cm-research-20260106

UX review for `cm research` (query -> `research.json`). Research is a credibility feature: it should feel evidence-backed, not hand-wavy.

References: `docs/dev/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Researcher/ideation (primary): wants evidence and angles quickly.
- Creator-operator: wants a short list of usable hooks and angles.
- Engineer-operator: wants transparent coverage and stable outputs.

## Job to be done

"Search sources, save evidence, and (optionally) propose angles that are clearly grounded in that evidence."

## Current behavior (as implemented today)

- Parses `--sources` (comma-separated); invalid entries are silently dropped.
- Runs source searches in parallel by default (or sequential with `--sequential`).
- Prints a short summary: sources searched, evidence count, suggested angles (if enabled), errors, output path, and total time.
- Supports `--dry-run`, `--mock` (for angle generation), `--no-angles`, `--max-angles`, and `--time-range`.

## Downstream integration (2026-01-07)

Research output can be used by downstream commands for evidence-based content:

### cm script

```bash
cm research -q "Redis caching" -o research.json
cm script --topic "Redis caching" --research research.json
```

Research evidence is injected into the script generation prompt, making content more credible and fact-based.

### cm generate

```bash
# Auto-run research
cm generate "Redis caching" --research

# Use existing research
cm generate "Redis caching" --research research.json
```

See [feature-research-script-integration-20260107.md](../dev/features/feature-research-script-integration-20260107.md) for full details.

## UX gaps

- Silent invalid sources breaks trust (user thinks a source ran when it did not).
- Progress is "one spinner"; users cannot see per-source timing/results without digging into output JSON.
- Root `--json` exists, but there is no single stdout JSON contract for the command result.

## Recommendations

### P0

- If the user specifies an invalid source, fail fast with exit code 2 and list allowed sources (or explicitly list ignored sources).
- In TTY mode, print per-source progress:
  - start, end, result count, duration, and error if any

### P1

- Add `--json` output for the full command result summary (schema versioned), including errors and timings.
- In `--verbose`, include "coverage" details (configured sources vs available sources vs actually queried sources).

## Ideal success output (ASCII sketch)

```
Research: "AI programming trends"
Sources: hackernews (10 results, 920ms), reddit (10 results, 1300ms)
Angles: 3
Output: out/research.json

Next: cm script --topic "AI programming trends" --research out/research.json
```

## UX acceptance criteria

- Invalid sources are not silently dropped; the CLI either fails fast (exit 2) or prints an explicit "ignored sources" list.
- Human output includes per-source timing and result counts.
- `--dry-run` performs no network calls and writes no files.
- Success output includes a "Next:" hint for using research with `cm script`.

## See also

- `docs/reference/cm-research-reference-20260106.md`
- `docs/reference/cm-script-reference-20260106.md`
- `docs/dev/features/feature-research-script-integration-20260107.md`
