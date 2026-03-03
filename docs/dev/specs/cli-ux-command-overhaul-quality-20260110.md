# Narrative: CLI UX Overhaul - Quality and Analysis Commands (20260110)

**Status:** Draft  
**Date:** 2026-01-10  
**Owners:** Unassigned

This document proposes concrete, non-interactive UX upgrades for the quality and analysis commands:

- `cm validate`
- `cm score`
- `cm rate`
- `cm research`
- `cm retrieve`

These commands are "trust anchors": they reduce risk, increase confidence, and make automation reliable.

## Method: Nielsen heuristics adapted for CLIs

See the rubric and heuristic map in `docs/dev/specs/cli-ux-command-overhaul-pipeline-20260110.md`.

**Scale:** 1 (poor) to 5 (excellent).

## Vendored references used (patterns to copy)

From `vendor/cli/examples/*`:

- `vendor/cli/examples/workers-sdk` (Wrangler): clear failures with fix lines; CI-friendly output.
- `vendor/cli/examples/firebase-tools`: "doctor"-like diagnostics and large-surface consistency.
- `vendor/cli/examples/pnpm`: minimal, disciplined output.
- `vendor/cli/examples/prisma`: human-readable checklists and actionable next steps.

From `vendor/cli/output/*`:

- `vendor/cli/output/boxen`: boxed callouts for warnings/errors (use sparingly).

## Shared tactical principles (apply to all in this doc)

1. **A quality command must be boring and precise.** No theatrical output; no fake progress.
2. **Every failure must include a fix.** Prefer copy/paste commands.
3. **Make automation the first-class mode.** `--json` must be consistent across commands (root contract).
4. **Exit codes must be stable and meaningful.** Usage invalid = 2; quality fail = 1; success = 0; user cancel = 130.

## `cm validate`

**JTBD:** "Tell me if this video is valid for the target profile; if not, tell me exactly what to change."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 2, H5 3, H6 3, H7 3, H8 4, H9 4, H10 3

**Top gaps**

- `--json` behavior is currently inconsistent with the global JSON envelope pattern.
- Human output should include a compact pass/fail summary for all gates, not only failures.
- Dependency errors (ffprobe/python/ffmpeg) should be preflighted and explained.

**10 improvement ideas**

1. **Unify JSON semantics (H4):** Align `cm validate --json` with the root JSON envelope (`CliJsonEnvelope`), and add an explicit `--report-json` (raw report) if needed. (Consistency.)
2. **Gate receipt (H1,H6,H8):** In human mode, always print a compact gate table: PASS/FAIL for each gate and a final "Validation PASSED/FAILED". (Prisma-style checklists from `vendor/cli/examples/prisma`.)
3. **Preflight dependencies (H5,H9):** Validate `ffprobe`/python paths early; if missing, print `Fix:` with exact OS-aware commands or `cm doctor` suggestion. (Firebase CLI style.)
4. **`--warn-only` (H3,H7):** Add `--warn-only` that exits 0 but records failures in the report (non-blocking workflows).
5. **`--fail-fast` (H7,H8):** Stop on first failing gate for speed in CI; still write report.
6. **Fix mapping to `cm render` (H2,H9):** When a gate fails, suggest the exact render flag that likely fixes it (orientation, fps, bitrate). (Match between system and world.)
7. **Profiles discoverability (H6,H10):** Add `cm validate --list-profiles` or include profiles and what they mean in help output.
8. **Output ergonomics (H6):** Always print `Report: <path>` and in verbose mode print absolute path.
9. **Stable quality thresholds (H4):** When using cadence/quality thresholds, print the thresholds used in the report summary so results are explainable.
10. **Summary-only mode (H8):** Add `--summary` to print only the PASS/FAIL status and failing gate names (stderr), keeping logs quiet for scripting (stdout unchanged).

## `cm score`

**JTBD:** "Score a script for quality/risk proxies and gate it for CI."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 4, H6 3, H7 3, H8 4, H9 4, H10 3

**Top gaps**

- Threshold semantics should be clearer (0..1 is not intuitive to many).
- Human output could be more structured (top failed checks, recommended fixes).
- Make it easier to compare scores across iterations.

**10 improvement ideas**

1. **Human-readable grade (H2,H6):** Print a letter grade (A/B/C) in addition to the numeric `overall` score (still store numeric in JSON). (Match to real world.)
2. **Top-3 failed checks first (H8,H6):** Print only top N failures by severity by default; `--verbose` prints all. (Minimalist.)
3. **Threshold UX (H6,H10):** Change `--min-overall` help text to explicitly say "0.0-1.0" and provide examples like `--min-overall 0.75`.
4. **Fix lines standardization (H9):** Every failing check should include a short fix line; if missing, print a generic fix: "Revise hook/CTA and re-run cm script". (Recovery.)
5. **Diff mode (H7):** Add `cm score --compare old.json new.json` that prints deltas and regressions (CI-friendly).
6. **Receipt includes inputs (H1):** Print which script/package file was scored and their last modified time (helps debugging stale files).
7. **Machine output clarity (H4):** Ensure JSON envelope outputs include `failedChecks[]` consistently (already present) and add `thresholdUsed`.
8. **Consistency with `cm rate` (H4):** Use similar phrasing: "PASSED" vs "FAILED" and consistent exit code semantics.
9. **Explainability hooks (H2,H9):** Add `--explain <checkId>` to print longer guidance for a specific check (docs-backed).
10. **Preset thresholds (H6):** Add `--preset strict|standard|lenient` mapping to `--min-overall` defaults (like sync presets).

## `cm rate`

**JTBD:** "Measure caption-audio sync quality on a rendered video and tell me how to improve it."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 4, H6 3, H7 3, H8 3, H9 4, H10 3

**Top gaps**

- The output is good but can be more "action-first" (what should I do next?).
- Dependency failures (OCR/ASR engines) must be diagnosed quickly.
- Provide repeatability knobs and sampling transparency.

**10 improvement ideas**

1. **Action-first summary (H6,H9):** Print a single first line: "Rating 82/100 PASSED" and then the breakdown; keep the full formatted report after. (Minimalist, confidence.)
2. **Suggested fix ranking (H9,H8):** Sort suggested fixes by expected impact and print top 3 by default; `--verbose` prints all.
3. **Sampling transparency (H1,H2):** Print "Sampled at fps=X, frames=N, duration=Ys" so users trust the rating.
4. **Preset thresholds (H6):** Add `--preset standard|quality|maximum` mapping to `--min-rating` and drift thresholds (mirrors `cm generate --sync-preset`).
5. **Dependency preflight (H5,H9):** Validate OCR/ASR prerequisites before long analysis; provide `Fix:` with install/config commands.
6. **`--regions` targeting (H7):** Add a flag to focus OCR on a caption bounding box region for speed and reliability (advanced).
7. **Output comparison (H7):** Add `--compare reportA.json reportB.json` to show improvements after changing caption settings.
8. **Failure recovery for low rating (H9):** If rating fails, print a minimal command recipe to try next (e.g., "Try: cm generate ... --sync-preset maximum --caption-group-ms 350").
9. **Quiet mode (H8):** Add `--summary` for CI: only print rating and pass/fail, and still write report JSON.
10. **Docs link (H10):** Link to the relevant sync strategy guide on failure/suggestions (keep it short, one line).

## `cm research`

**JTBD:** "Collect evidence and angles with transparent coverage and stable output."

**Baseline heuristic scorecard (1-5):**  
H1 2, H2 4, H3 3, H4 2, H5 2, H6 3, H7 3, H8 4, H9 3, H10 3

**Top gaps**

- Invalid sources are silently dropped (trust-breaking).
- Per-source progress and result counts are not visible enough by default.
- JSON envelope output should be standardized (root contract).

**10 improvement ideas**

1. **No silent drops (H5,H9):** Fail fast on unknown sources (exit 2) and list allowed sources; optionally add `--ignore-unknown-sources`. (Error prevention.)
2. **Per-source progress lines (H1):** Always show per-source start/end, results count, and duration in TTY and non-TTY. (Visibility.)
3. **Coverage summary (H1,H2):** Print "Configured sources: X, Queried: Y, Errors: Z" so users understand completeness.
4. **Standardize `--json` (H4):** Implement root JSON envelope for command summary; add `--report-json` for raw evidence list if needed.
5. **Determinism knobs (H7):** Add `--seed` for angle generation so that CI/test runs are repeatable (when LLM is involved).
6. **`--no-network` dry run (H5):** Strengthen `--dry-run` so it prints planned sources and query normalization and guarantees no network.
7. **Source limit knobs (H7):** Add `--max-results-per-source` and print that in receipt; reduces surprise variability.
8. **Error grouping (H8):** Group errors by source and print one-line summary per source; avoid multi-page logs.
9. **Downstream hint (H6):** Always print the exact follow-up command to use research with script/generate (already recommended; enforce).
10. **Citations preview (H6):** In `--verbose`, print top 3 evidence items (title + URL) per source for quick inspection (like `cm retrieve` does).

## `cm retrieve`

**JTBD:** "Query a local retrieval index and return top-k evidence quickly."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 4, H5 4, H6 3, H7 3, H8 4, H9 3, H10 2

**Top gaps**

- Prototype command needs better help/examples and clearer purpose boundaries.
- Result presentation could be richer (why did this match?).
- Stronger preflight for index schema and dimensions.

**10 improvement ideas**

1. **Explain prototype status (H2,H10):** In help output, explicitly label as prototype and explain how to create the index and what to expect.
2. **Index preflight (H5,H9):** Validate the index schema and dimensions early; on failure print `Fix:` referencing the index builder command/docs.
3. **Top-k formatting (H8):** Print a compact ranked list with score, title, and URL; avoid multi-line spam by default.
4. **`--format` (H7):** Add `--format text|jsonl|markdown` for easy copy/paste and tooling.
5. **Query echo (H1):** Always print normalized query and k used in stderr receipt.
6. **Explainability (H2,H6):** Add `--show-snippet` to print a short excerpt from the evidence that influenced the match.
7. **`--min-score` (H7):** Filter results by score threshold, and print how many were filtered out.
8. **Better output naming (H6):** Default output path should include a timestamp or query slug (avoid accidental overwrite), or fail fast unless `--force`.
9. **Next-step hints (H6):** Print "Next: cm script --topic ... --research <file>" if the retrieve output matches the research format (or document how to convert).
10. **Error code discipline (H4):** Treat invalid args/index parse as exit 2, runtime errors as exit 1 (standardize).

## Related docs

- `docs/dev/guides/guide-cli-ux-standards-20260106.md`
- `docs/dev/guides/guide-cli-stdout-stderr-contract-20260107.md`
- `docs/dev/features/feature-cli-json-contract-20260106.md`
- `docs/dev/features/feature-cli-progress-events-20260106.md`
- Existing per-command UX reviews:
  - `docs/dev/guides/guide-cli-ux-cm-research-20260106.md`
  - `docs/dev/guides/guide-cli-ux-cm-validate-20260106.md`
