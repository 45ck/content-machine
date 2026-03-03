# Narrative: CLI UX Overhaul - Pipeline Commands (20260110)

**Status:** Draft  
**Date:** 2026-01-10  
**Owners:** Unassigned

This document proposes concrete, non-interactive UX upgrades for the pipeline commands:

- `cm generate`
- `cm script`
- `cm audio`
- `cm visuals`
- `cm render`

It is intentionally "app-like" without introducing a full-screen TUI.

## Method: Nielsen heuristics adapted for CLIs

We use Nielsen's 10 heuristics as a rubric, adapted for command-line products.

**Scale:** 1 (poor) to 5 (excellent). Scores are baseline estimates from current code + docs, used to prioritize improvements.

### Heuristic map (H1-H10)

- **H1 Visibility of status:** clear stage/phase/progress, not stuck.
- **H2 Match to real world:** user language ("bundling", "rendering"), not internal jargon.
- **H3 User control/freedom:** easy cancel (exit 130), safe retry, non-destructive defaults.
- **H4 Consistency/standards:** same flags/contracts mean same behavior across commands.
- **H5 Error prevention:** preflight validation (files exist, schemas parse) before doing work.
- **H6 Recognition not recall:** defaults, presets, and "Next:" guidance reduce memory load.
- **H7 Flexibility/efficiency:** power flags, shortcuts, and resumability without extra complexity.
- **H8 Aesthetic/minimalist:** compact output, no noise; strong whitespace discipline.
- **H9 Help users recover:** actionable "Fix:" lines and contextual hints.
- **H10 Help/docs:** high-signal `--help`, examples, and docs references.

## Vendored references used (patterns to copy)

From `vendor/cli/examples/*`:

- `vendor/cli/examples/workers-sdk` (Wrangler): errors with fixes, stable summaries.
- `vendor/cli/examples/vercel`: "Next steps" as a first-class UX pattern.
- `vendor/cli/examples/prisma`: guided-feeling output and strong "what happened" receipts.
- `vendor/cli/examples/pnpm`: disciplined output and minimal noise.

From `vendor/cli/motion/*` and `vendor/cli/output/*`:

- `vendor/cli/motion/listr2`: staged task UX for pipelines.
- `vendor/cli/output/boxen`: boxed callouts for important warnings (use sparingly).

## Shared tactical principles (apply to all pipeline commands)

1. **Stdout is the result; stderr is the UI.** Do not leak progress/logs to stdout.
2. **Always print a final receipt** (outputs + timings + next step) in human mode.
3. **Fail fast on invalid inputs** (exit code 2) before long-running steps.
4. **Never surprise-delete files.** If cleanup happens, say what is removed and how to keep it.
5. **ASCII-first output by default** (Windows-friendly). Fancy output is opt-in.

## `cm generate`

**JTBD:** "Turn a topic into an upload-ready MP4 and tell me exactly where everything went."

**Baseline heuristic scorecard (1-5):**  
H1 4, H2 4, H3 3, H4 4, H5 3, H6 3, H7 3, H8 4, H9 3, H10 3

**Top gaps**

- Artifact visibility is not complete (users want per-stage paths, not just "Artifacts: dir").
- Recovery is not yet "one command" (retry/resume story is not standardized).
- Discovery of presets/advanced flags is still "read the help".

**10 improvement ideas**

1. **Receipt output (H1,H6,H8):** Always print a post-run receipt listing _every_ artifact path produced (script/audio/timestamps/visuals/video), plus `Next:` suggestions (validate, rate). (Inspired by `vendor/cli/examples/prisma`.)
2. **Artifact-as-you-go events (H1,H9):** Emit/print `artifact written` lines per stage as files land (especially with `--keep-artifacts`). (Pattern: "what changed" summaries from `vendor/cli/examples/workers-sdk`.)
3. **Preflight mode (H5,H9):** Add a `--preflight` flag that validates dependencies (keys, whisper availability, template resolve, gameplay clip availability) and exits 0/1 without generating. (Pattern: "doctor" style checks seen in large CLIs like `vendor/cli/examples/firebase-tools`.)
4. **Resumability story (H3,H7,H9):** Add a documented `--resume` mode: reuse existing artifacts in the artifacts dir when compatible (e.g., reuse audio+timestamps if present). Print exactly what was reused. (Pattern: pnpm-style "reusing cached" messaging in `vendor/cli/examples/pnpm`.)
5. **Preset-focused help (H6,H10):** Promote `--sync-preset fast|standard|quality|maximum` to the top of help and header output; print which preset is active and what it implies (pipeline/reconcile/quality check). (Pattern: Wrangler `--help` highlights common paths.)
6. **Structured stage timing summary (H1,H8):** At end, show per-stage duration (script/audio/visuals/render) and total. (Leverage existing event timing; pattern from `vendor/cli/examples/prisma` receipts.)
7. **Failure recovery snippet (H9,H10):** On failure, print a ready-to-run recovery command based on where it failed, e.g. `Next: cm audio -i <script>` or `Next: cm render ...`. (Pattern: Vercel "Next steps" `vendor/cli/examples/vercel`.)
8. **Output path UX (H2,H6):** Print absolute paths in TTY mode for Windows usability, while keeping stdout as the relative primary path. (Pattern: many CLIs show absolute in stderr while keeping stdout stable.)
9. **Progress phase naming contract (H1,H4):** Lock a stable phase vocabulary for each stage (e.g., `research`, `llm`, `tts`, `asr`, `align`, `search`, `download`, `bundle`, `render-media`) so progress feels consistent across runs. (Align with `docs/dev/features/feature-cli-progress-events-20260106.md`.)
10. **Quality tail (H6,H7):** Add an optional `--post` group, e.g. `--post validate,rate` to automatically run quality tools after render and include results in the receipt. (Pattern: "pipeline chaining" from CI-minded tools.)

## `cm script`

**JTBD:** "Give me a `script.json` I can inspect, edit, and feed downstream."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 3, H5 3, H6 3, H7 3, H8 4, H9 3, H10 3

**Top gaps**

- Input validation for numeric args is late/unclear in some cases.
- Research/package file failures need more "Fix:" specificity (some exists, standardize everywhere).
- Iteration loop could be faster (diff, resume, deterministic knobs).

**10 improvement ideas**

1. **Strict arg validation (H5,H9):** Validate `--duration` range and type at CLI boundary; on failure include `Fix: --duration 45`. (Pattern: Wrangler-style early validation.)
2. **Deterministic mode (H3,H7):** Add `--seed` or `--deterministic` to stabilize outputs for testing and iteration. Print the seed used in receipt. (Pattern: reproducibility culture in `vendor/cli/examples/pnpm`.)
3. **One-line stdout path always (H4,H8):** In human mode, stdout prints only the output path; stderr contains the summary. Ensure this matches the global stdout/stderr contract everywhere. (Consistency with `docs/dev/guides/guide-cli-stdout-stderr-contract-20260107.md`.)
4. **Script lint checks (H5,H9):** After generating, run quick programmatic checks (scene count, total duration estimate, missing hook) and print warnings with fixes. (Pattern: Prisma warnings with suggestions.)
5. **Diff-friendly output (H6,H7):** Add `--pretty` (stderr only) to print a compact scene outline (no full JSON), so creators can judge quickly. Keep JSON artifact unchanged. (Pattern: pnpm minimal human output.)
6. **Package/research recovery commands (H9,H10):** On schema errors for `--package` or `--research`, always print exact recovery commands (as the current guide recommends). (Pattern: "Fix:" lines.)
7. **`--dry-run` precision (H1,H5):** `--dry-run` should print: resolved archetype, target word count, chosen model/provider, and output path, and guarantee no network calls. (Visibility and prevention.)
8. **Auto-open artifact hint (H6):** Print `Open: <path>` and an OS-specific open snippet on stderr (opt-in `--open` later). (Pattern: "copy/paste next action" from Vercel.)
9. **Per-scene quality tags (H2,H6):** Add (optional) tags in the script output metadata that explain intent (hook, payoff, CTA). In human summary, show counts. (Helps recognition during iteration.)
10. **Better help examples (H10):** Add 3 canonical examples in `--help`: basic, with packaging, with research. (Match existing doc patterns.)

## `cm audio`

**JTBD:** "Turn `script.json` into `audio.wav` and `timestamps.json` I can trust."

**Baseline heuristic scorecard (1-5):**  
H1 2, H2 4, H3 3, H4 3, H5 2, H6 2, H7 3, H8 4, H9 3, H10 2

**Top gaps**

- Single-spinner hides sub-phases (tts/asr/align) and feels stuck.
- No voice discoverability; invalid voices fail late.
- Input schema validation should be early and clear.

**10 improvement ideas**

1. **Sub-phase progress events (H1,H4):** Emit `tts`, `asr`, `align` phases with percent or at least start/stop durations. (Align with `docs/dev/features/feature-cli-progress-events-20260106.md`.)
2. **Input schema preflight (H5,H9):** Validate `--input` against `ScriptOutputSchema` before any audio work; error includes `Fix: pass script.json from cm script`. (Error prevention.)
3. **`cm audio voices` list (H6,H10):** Add a discoverable voice list command or `--list-voices`. (Pattern: "list" UX in many CLIs.)
4. **Voice validation (H5):** Validate `--voice` before generation; if unknown, list close matches and show how to list all. (Pattern: Yarn/Clipanion style suggestions, referenced by `vendor/cli/frameworks/clipanion`.)
5. **Dependency diagnostics (H9):** If Whisper is missing, print a single copy/paste install command referencing the repo's whisper setup instructions. (Match fix-line standard.)
6. **Receipt with downstream hint (H6):** Always print `Next: cm visuals -i <timestamps>` and include both output paths. (Pattern: Vercel next steps.)
7. **Runtime estimates (H1):** Print measured TTS/ASR durations and word counts; avoid ETA guesses but show throughput (e.g., "ASR: 41s audio processed in 12s"). (Trustworthy status.)
8. **`--dry-run` parity (H5):** Add `--dry-run` that validates input schema, resolves voice, and prints planned outputs without generating audio. (Prevention.)
9. **`--overwrite` behavior (H3,H5):** If output files exist, choose a consistent default (fail fast with fix, or overwrite with `--force`). Document it and implement uniformly. (Safety and control.)
10. **Noise discipline in non-TTY (H8):** In non-TTY, print coarse progress lines only (10% buckets) and always one final receipt. (Matches existing progress observer pattern.)

## `cm visuals`

**JTBD:** "Given timestamps, select visuals per scene and output a renderable `visuals.json`."

**Baseline heuristic scorecard (1-5):**  
H1 3, H2 4, H3 3, H4 3, H5 3, H6 2, H7 3, H8 4, H9 3, H10 3

**Top gaps**

- Users often pass the wrong input file; help must make the "timestamps.json" requirement unmistakable.
- Provider errors (missing keys, invalid provider) must fail fast and be explicit.
- Debuggability: show what queries were used and why fallbacks happened.

**10 improvement ideas**

1. **Input type guard (H5,H9):** Detect common wrong inputs (`script.json`) and fail fast with `Fix: pass timestamps.json from cm audio`. (Error prevention.)
2. **Provider enum validation (H4,H5):** Validate `--provider` and list allowed providers on error. (Consistency.)
3. **Per-scene verbose trace (H1,H9):** In `--verbose`, print query term, hits, chosen asset, and fallback reason per scene. (Transparency.)
4. **Dry-run provider plan (H5,H6):** Add `--dry-run` that prints planned provider + per-scene queries without API calls. (Helps recognition.)
5. **Credential preflight (H5,H9):** Check provider keys at start and print `Fix:` with OS-appropriate examples. (Pattern: setup guidance like `cm init` recommendations; also inspired by common CLIs.)
6. **Receipt includes counts (H1,H8):** Always print totals (scenes, stock hits, fallbacks) and output path; keep it compact. (Aesthetic/minimalist.)
7. **Stable phase naming (H4):** Use phases like `keyword-extract`, `provider-search`, `download`, `fallback` with percent. (Consistency with events.)
8. **Cache messaging (H1,H7):** If reusing cached stock downloads, print "Reused cached clip" in verbose mode only. (Efficiency.)
9. **`--max-per-scene` and `--min-quality` knobs (H7):** Provide controlled flexibility for power users (limit search, require portrait orientation). Document in help. (Flexibility.)
10. **Next-step command output (H6):** Always print the exact `cm render` invocation with resolved inputs (timestamps + audio + visuals). (Pattern: Vercel "copy/paste next".)

## `cm render`

**JTBD:** "Render an MP4 from visuals+audio+timestamps reliably and transparently."

**Baseline heuristic scorecard (1-5):**  
H1 4, H2 4, H3 3, H4 4, H5 3, H6 3, H7 3, H8 4, H9 3, H10 3

**Top gaps**

- Preflights should catch schema mismatches and missing files before bundling.
- Help and receipts should connect render outputs to validate/rate next steps.
- Some options should be validated uniformly (fps, orientation, etc.).

**10 improvement ideas**

1. **Strict preflight (H5,H9):** Validate visuals schema, timestamps schema, and that all referenced file paths exist before bundle. Error points to the stage that produces the missing file. (Recovery.)
2. **Stable phases (H1,H4):** Use stable progress phases (`bundle`, `select-composition`, `render-media`) and keep them consistent across versions. (Consistency; matches existing docs.)
3. **Render receipt includes profile hint (H6):** Print `Next: cm validate <video> --profile portrait` (or inferred from orientation). (Recognition.)
4. **`--dry-run` parity (H5):** Add `--dry-run` that resolves template/composition/dimensions/fps and prints the computed plan without bundling. (Error prevention.)
5. **`--open` (optional) (H3,H6):** Provide opt-in open behavior for the output folder or file (stderr only; stdout stays path). (User control.)
6. **Consistency with `--json` (H4):** Ensure the root `--json` envelope includes all key fields (duration, dimensions, file size) and that no other JSON is printed. (Standards.)
7. **Better error extraction (H9):** On Remotion failures, surface the top-level cause and one actionable fix (missing codec, missing browser, bad template). Hide stack traces behind `--verbose`. (Prisma-style friendly error with details.)
8. **Resource warning (H1,H8):** If terminal is TTY and render is long, print one line "This may take a few minutes" once, not repeatedly. (Minimalist.)
9. **Template clarity (H2,H6):** In human mode header, print resolved template id and source; avoid confusion when a user passes `--template`. (Match to real world.)
10. **Post-render chain option (H7):** Add `--post validate,rate` for power users to automatically run checks. (Efficiency, optional.)

## Related docs

- `docs/dev/guides/guide-cli-ux-standards-20260106.md`
- `docs/dev/guides/guide-cli-stdout-stderr-contract-20260107.md`
- `docs/dev/features/feature-cli-progress-events-20260106.md`
- Existing per-command UX reviews:
  - `docs/dev/guides/guide-cli-ux-cm-generate-20260106.md`
  - `docs/dev/guides/guide-cli-ux-cm-script-20260106.md`
  - `docs/dev/guides/guide-cli-ux-cm-audio-20260106.md`
  - `docs/dev/guides/guide-cli-ux-cm-visuals-20260106.md`
  - `docs/dev/guides/guide-cli-ux-cm-render-20260106.md`
