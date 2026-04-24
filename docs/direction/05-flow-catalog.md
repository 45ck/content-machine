---
document: 05-flow-catalog
status: draft
ratified: false
phase: phase-0
supersedes: []
depends-on:
  - 00-overview.md
  - 01-boundaries.md
  - 02-keep-move-deprecate.md
  - 03-reorg-synthesis.md
  - 04-skill-catalog.md
owner: architecture
last-reviewed: 2026-04-22
---

# 05 - Flow Catalogue

## 1. Overview

This document is the authoritative catalogue of the prompt-language flows
that will live under `content-machine/flows/*.flow`. It is the human-readable
spec; the in-repo `.flow` files are the executable artifacts. The structural
rationale is in `03-reorg-synthesis.md` (three-layer split: harness above,
prompt-language in the middle, skills below). The flow DSL itself is owned
by `@45ck/prompt-language` and the authoring conventions follow its SDK
guide; do not duplicate syntax rules here.

A flow, in this project, is a short declarative program that:

- reads a small set of typed inputs (CLI args, env, files),
- calls one or more skills (JSON-stdio subprocesses invoked as
  `cm-skill <name>`) in a controlled topology (sequential, parallel, race,
  retry),
- writes artifacts to the run directory under `runs/<run-id>/`,
- closes on a set of completion gates that are either prompt-language
  built-ins or user-defined predicates.

Flows are the replacement layer for most of what today lives in
`src/cli/commands/*.ts` and in `scripts/phoenix-loop-*.ts`. The CLI becomes
a thin dispatcher that picks a flow and binds inputs; see
`phases/phase-5-cli-decision.md` for the CLI retirement plan.

### What this document is not

- Not a syntax reference for prompt-language. That lives in the SDK guide.
- Not a skill catalogue. That lives in `04-skill-catalog.md`.
- Not executable. The parser must not pick this file up as DSL. Per the
  critical constraint in the brief, DSL sketches below are indented
  plain-text pseudocode; the gate-predicate token and the
  completion-clause token from the DSL are deliberately rewritten in
  kebab-case (for example, the tests-pass-gate name and the
  completion-gates clause name) so the parser does not treat this
  document as a live flow.

## 2. Flow manifest shape

Every flow in section 4 follows the same manifest:

- name: kebab-case, matches filename `flows/<name>.flow`.
- purpose: one sentence, action-oriented.
- inputs: list of `{name, type, required|optional, description}`.
- outputs: list of `{artifact path or variable, description}`.
- skills called: ordered list; names must exist in `04-skill-catalog.md`.
- control flow: prose description of the loop, spawn, retry, branch
  structure. No fenced DSL.
- completion gates: list of predicate expressions, inline code, not a
  fenced block.
- failure modes: 2 to 4 bullets describing what can go wrong and what the
  flow does when it does.
- parallelism: whether it uses `spawn` / `await` / `race`, and the
  concurrency ceiling.
- phase: the beads phase when the flow lands (see
  `phases/phase-4-skills.md` onward).
- status: `planned` for all Phase 0 entries.
- notes: non-obvious decisions and open items.

## 3. Revisions to the preliminary list

Preliminary list (10): generate-short, parallel-script-variants,
parallel-visual-search, evaluate-batch, lab-sweep, caption-sweep, doctor,
vendor-refresh, regenerate-fixtures, showcase-replay.

Changes after review:

- Kept all 10.
- Added `preflight-check` as a small, standalone gating flow (11th).
  Justification: today `src/cli/commands/generate-preflight.ts` is a
  first-class pre-run checker consumed by multiple CLI entrypoints. It is
  too small to embed inside every generation flow and too important to
  inline; promoting it to its own flow lets both `generate-short` and
  `evaluate-batch` share it and lets local checks run it standalone.
- Did not split `lab-sweep` and `caption-sweep` further. They are
  structurally similar (parametric sweep over a metric gate) but have
  different skills and different gate predicates; merging them would force
  a union input schema and confuse operators.
- Did not merge `parallel-script-variants` and `parallel-visual-search`.
  They share the spawn/await shape but differ in skill set, artifact
  layout, and downstream consumers (script goes to `generate-short`;
  visual goes to `evaluate-batch`). Merging would hide that the variant
  cardinalities and cost profiles are different.

Final flow count: 11.

## 4. Flow catalogue

### 4.1 preflight-check

- name: preflight-check
- purpose: Validate environment, binaries, model cache, and config before
  any expensive generation or evaluation flow runs.
- inputs:
  - profile: string, optional (default: `default`). Which environment
    profile to check (e.g. `ci`, `local-gpu`, `local-cpu`).
  - strict: bool, optional (default: true). If false, warnings do not fail
    the gate.
- outputs:
  - `runs/<run-id>/preflight.json`: structured report of every check.
  - `runs/<run-id>/preflight.summary.md`: human summary.
- skills called:
  - `env-probe` (reads env, versions, paths)
  - `model-cache-probe` (resolves model manifest, checks local cache)
  - `ffmpeg-probe` (verifies ffmpeg and codecs)
  - `config-validate` (validates `content-machine.config.*`)
- control flow: Sequential. Each probe skill is called in order and its
  JSON result is merged into `preflight.json`. A final reducer step
  computes a top-level `ok` boolean. No spawn. No retry (probes are fast
  and deterministic; if they flake, the issue is real).
- completion gates: `file-exists(runs/<run-id>/preflight.json)` AND
  `preflight.ok == true` (asserted via an inline
  `ask "is preflight.ok true?" grounded-by "jq .ok runs/<run-id>/preflight.json"`
  predicate, or the user-defined `preflight-pass-gate` once defined).
- failure modes:
  - Missing ffmpeg or wrong version: emits a fix suggestion and fails the
    gate with a non-zero exit.
  - Model cache miss in strict mode: fails; in non-strict mode, downgrades
    to a warning and the gate still passes.
  - Config schema mismatch: fails; the flow does not attempt to
    auto-migrate.
- parallelism: None. Each probe is cheap; serialising keeps error
  ordering readable.
- phase: Phase 4 wave 1.
- status: planned.
- notes: Replaces `src/cli/commands/generate-preflight.ts` and the
  doctor-lite path inside `src/cli/commands/doctor.ts`. This is called
  transitively by `generate-short` and `evaluate-batch` via a
  `preflight-check` sub-flow invocation; the CLI also exposes it directly
  as `cm preflight`.

### 4.2 generate-short

- name: generate-short
- purpose: Produce one short-form video end to end from a topic or brief.
- inputs:
  - topic: string, required.
  - archetype: string, optional (default resolved by `classify`).
  - duration-sec: integer, optional (default 30).
  - voice: string, optional.
  - seed: integer, optional (for determinism).
- outputs:
  - `runs/<run-id>/script.json`: final script with beats.
  - `runs/<run-id>/visuals/`: selected visual asset ids and manifest.
  - `runs/<run-id>/captions.json`: timed captions.
  - `runs/<run-id>/render.mp4`: final render.
  - `runs/<run-id>/evaluation.json`: scorecard summary.
- skills called:
  - `preflight-check` (as sub-flow, not a skill; see 4.1)
  - `classify`
  - `script-generate`
  - `visual-search`
  - `visual-select`
  - `caption-generate`
  - `caption-quality-gate`
  - `video-render`
  - `evaluate-short`
- control flow: Sequential main line with two bounded parallel segments.
  Step 1 runs `preflight-check` as a sub-flow and short-circuits on
  failure. Step 2 runs `classify` to resolve archetype if absent. Step 3
  spawns `script-generate` and `visual-search` in parallel and awaits
  both (concurrency 2). Step 4 runs `visual-select` with the script and
  visual candidates. Step 5 runs `caption-generate` then
  `caption-quality-gate` with retry max 3 on caption failure, where each
  retry asks `script-generate` to tighten beats. Step 6 runs
  `video-render`. Step 7 runs `evaluate-short`.
- completion gates: `file-exists(runs/<run-id>/render.mp4)` AND
  `caption-qa-pass` (user-defined gate: caption QA JSON ok) AND
  `hook-strength >= 0.6` (user-defined gate over the evaluation report)
  AND `tests-pass-gate` on the fixture smoke test for the generated
  artifact schemas.
- failure modes:
  - Caption QA fails 3 times: flow exits non-zero with
    `runs/<run-id>/failure.json` describing the last QA diff.
  - Visual search yields fewer than N candidates: falls back to
    `vendor/placeholders` and flags the run as degraded (not a hard
    failure but downstream evaluation will mark `degraded: true`).
  - Render fails: no retry (render is deterministic given assets);
    surface the ffmpeg stderr into `runs/<run-id>/render.err`.
  - Preflight fails: flow never starts the expensive path.
- parallelism: 1 spawn pair (script + visual search), concurrency 2.
- phase: Phase 4 wave 1.
- status: planned.
- notes: Replaces `src/cli/commands/generate.ts`,
  `generate-output.ts`, `generate-quality.ts`, `generate-sync.ts`,
  `generate-defaults.ts`, and the orchestration parts of
  `src/workflows/runner.ts`. This is the canary flow for Phase 4.

### 4.3 parallel-script-variants

- name: parallel-script-variants
- purpose: Generate N competing scripts for the same topic and pick the
  best one by a user-defined quality gate.
- inputs:
  - topic: string, required.
  - n-variants: integer, optional (default 4, ceiling 8).
  - archetype: string, optional.
  - seed-base: integer, optional.
- outputs:
  - `runs/<run-id>/variants/<i>/script.json`: one per variant.
  - `runs/<run-id>/variants/<i>/score.json`: per-variant score.
  - `runs/<run-id>/winner.json`: selected variant and rationale.
- skills called:
  - `script-generate`
  - `script-score`
  - `script-select`
- control flow: `foreach-spawn` over variant indices 0..n-1 with
  concurrency ceiling 4 (heavy flow: each variant calls an LLM). Each
  child runs `script-generate` with `seed-base + i` then `script-score`.
  After all children return, the parent runs `script-select` which picks
  the winner and writes `winner.json`. Retry max 3 on `script-generate`
  for transient LLM errors; no retry on `script-score` (deterministic).
- completion gates: `file-exists(runs/<run-id>/winner.json)` AND
  `winner.score >= threshold` (user-defined `hook-strength-threshold`
  gate) AND `diff-nonempty` across the top two variants (ensures the
  sweep actually produced variation; if variants collapse, something is
  wrong with temperature or seeds).
- failure modes:
  - All variants fail the score threshold: flow exits non-zero and writes
    `runs/<run-id>/diagnostic.md` listing score distribution.
  - A single child crashes: other children continue; parent marks that
    slot as missing and proceeds if at least `ceil(n/2)` completed.
  - Variant collapse (all scripts near-identical): fails the
    `diff-nonempty` gate; operator guidance is to raise temperature or
    diversify prompts.
- parallelism: `foreach-spawn`, ceiling 4.
- phase: Phase 4 wave 2.
- status: planned.
- notes: This is the intended upstream for `generate-short` when the
  operator wants variant selection. In Phase 4 wave 1 we keep
  `generate-short` linear on the script step; wave 2 composes this flow
  in.

### 4.4 parallel-visual-search

- name: parallel-visual-search
- purpose: Search multiple visual providers in parallel for each beat and
  assemble a ranked candidate pool.
- inputs:
  - beats: list of beat objects (from a script), required.
  - providers: list of provider ids, optional (default from config).
  - per-beat-cap: integer, optional (default 8).
- outputs:
  - `runs/<run-id>/visuals/candidates.json`: ranked candidate pool per
    beat.
  - `runs/<run-id>/visuals/providers.<name>.json`: per-provider raw
    responses (for audit).
- skills called:
  - `visual-search` (one invocation per provider)
  - `visual-rank`
- control flow: Two-level spawn. Outer `foreach-spawn` over beats with
  concurrency 4; inner `foreach-spawn` over providers with concurrency 4.
  Effective ceiling is 16 in-flight subprocesses; we cap the outer at 4
  to avoid saturating rate limits. Each leaf invocation is
  `visual-search` with `retry max 3` and an exponential backoff. After
  all provider calls for a beat return (or time out), the parent beat
  process calls `visual-rank` to merge and dedupe. Use `race` only for
  the rank step if multiple rankers are configured (not wave 1).
- completion gates: `file-exists(runs/<run-id>/visuals/candidates.json)`
  AND per-beat `candidates.length >= 1` (inline predicate) AND no beat
  has only degraded (placeholder) candidates unless `allow-degraded:
true`.
- failure modes:
  - Provider hard failure (auth, 5xx loop): that provider's subprocess
    times out after 60s; remaining providers still contribute.
  - Every provider fails for a beat: that beat gets placeholder
    candidates and the flow marks the beat degraded. Gate fails unless
    `allow-degraded` is set.
  - Rate-limit storm: `retry max 3` with backoff; after that, provider is
    blacklisted for the rest of the run.
- parallelism: Two-level `foreach-spawn`, outer ceiling 4, inner ceiling 4.
- phase: Phase 4 wave 2.
- status: planned.
- notes: Replaces most of `src/cli/commands/visuals.ts` and the search
  fan-out currently embedded in `src/workflows/runner.ts`.

### 4.5 evaluate-batch

- name: evaluate-batch
- purpose: Run the full evaluation scorecard against a batch of existing
  runs and produce a comparative report.
- inputs:
  - run-ids: list of run ids or a glob against `runs/`, required.
  - baseline-run-id: string, optional (for delta reporting).
  - metrics: list of metric names, optional (default: all).
- outputs:
  - `runs/<batch-id>/report.json`: structured batch report.
  - `runs/<batch-id>/report.md`: human-readable summary.
  - `runs/<batch-id>/deltas.json`: if baseline provided.
- skills called:
  - `evaluate-short`
  - `evaluate-retention`
  - `evaluate-caption-qa`
  - `evaluate-risk`
  - `report-render`
- control flow: `foreach-spawn` over run-ids with concurrency ceiling 8
  (light flow: evaluation skills are read-only and CPU-bound). Each child
  runs the four `evaluate-*` skills sequentially (they share an input
  manifest so parallelising them inside a child gives little). Parent
  collects all per-run reports then calls `report-render`. If
  `baseline-run-id` is set, `report-render` also emits `deltas.json`.
- completion gates: `file-exists(runs/<batch-id>/report.json)` AND every
  run produced a report (inline predicate:
  `count(reports) == count(run-ids)` with a tolerance of 0) AND
  `retention-curve-ok` (user-defined gate) on the batch-level aggregate.
- failure modes:
  - A single run is corrupt (missing `render.mp4` or `script.json`): that
    child marks itself `skipped` with a reason; the batch still
    completes if at least 80 percent of runs succeed.
  - Metric computation throws (e.g. bad frame index): captured as a
    `metric-error` in the per-run report and surfaced in the summary.
  - Baseline missing: flow downgrades to no-delta mode with a warning.
- parallelism: `foreach-spawn`, ceiling 8.
- phase: Phase 4 wave 2.
- status: planned.
- notes: Replaces `src/cli/commands/evaluate.ts` and the showcase batch
  bits inside `evaluations/showcase-*.json` replayers (see also 4.11).

### 4.6 lab-sweep

- name: lab-sweep
- purpose: Run a parametric sweep over a single pipeline knob (e.g.
  temperature, visual-rank weights) and report the metric response curve.
- inputs:
  - sweep-spec: object `{param, values[], base-config}`, required.
  - topic: string, required.
  - metric: string, required (which metric drives the decision).
- outputs:
  - `runs/<sweep-id>/points/<i>/`: one run per sweep point.
  - `runs/<sweep-id>/curve.json`: metric vs param.
  - `runs/<sweep-id>/decision.md`: operator-facing recommendation.
- skills called:
  - `generate-short` (as sub-flow)
  - `evaluate-short`
  - `curve-fit`
  - `decision-render`
- control flow: `foreach-spawn` over sweep values with concurrency
  ceiling 4 (heavy: each point is a full generate-short). Each child is
  a sub-flow invocation of `generate-short` with the param overridden,
  followed by `evaluate-short`. Parent collects metric values then runs
  `curve-fit` and `decision-render`. Retry max 5 on `generate-short` for
  the tuning loop (user explicitly wants robustness in sweeps), with
  each retry using a new seed.
- completion gates: `file-exists(runs/<sweep-id>/curve.json)` AND the
  curve has at least one monotonic segment of length 3 (inline predicate;
  prevents accepting pure noise) AND
  `file-exists(runs/<sweep-id>/decision.md)`.
- failure modes:
  - More than 30 percent of sweep points fail their sub-flow gate: flow
    exits non-zero; the curve is not trustworthy.
  - Curve-fit finds no signal (flat within noise): `decision.md`
    recommends narrowing the range and does not claim a winner. This is
    a pass, not a fail; the gate accepts "no improvement" as a valid
    outcome.
  - Budget blown: spawn budget enforcement halts new children but lets
    in-flight ones finish.
- parallelism: `foreach-spawn`, ceiling 4.
- phase: Phase 4 wave 3.
- status: planned.
- notes: Replaces `src/cli/commands/lab.ts`. The sub-flow composition is
  the riskiest part of the design; see open question 9.2.

### 4.7 caption-sweep

- name: caption-sweep
- purpose: Sweep caption generation parameters (model, prompt preset,
  wpm, style) against an existing script and render and pick the best by
  caption QA.
- inputs:
  - run-id: string, required (the base run whose script is reused).
  - presets: list of preset ids, required.
  - wpm-range: `{min, max, step}`, optional.
- outputs:
  - `runs/<run-id>/caption-sweep/<preset>.<wpm>/captions.json`.
  - `runs/<run-id>/caption-sweep/summary.json`.
  - `runs/<run-id>/caption-sweep/winner.json`.
- skills called:
  - `caption-generate`
  - `caption-quality-gate`
  - `caption-select`
- control flow: `foreach-spawn` over the cartesian product of presets and
  wpm values with concurrency ceiling 8 (light: caption generation is
  cheap relative to render). Each child runs `caption-generate` then
  `caption-quality-gate`; failed QA entries are retained but marked
  `qa-fail`. Parent runs `caption-select` which picks the highest
  passing entry (ties broken by latency then alphabetically by preset).
- completion gates: `file-exists(.../winner.json)` AND at least one
  entry passed `caption-qa-pass` (user-defined gate) AND
  `diff-nonempty` between the winner and the baseline captions (else
  the sweep taught us nothing).
- failure modes:
  - All combinations fail QA: flow exits non-zero with a histogram of
    failure reasons.
  - Base run is missing or malformed: fails early with a clear pointer
    to the expected path.
  - Preset id unknown: skipped with a warning; does not fail the flow
    unless every preset is unknown.
- parallelism: `foreach-spawn`, ceiling 8.
- phase: Phase 4 wave 3.
- status: planned.
- notes: Replaces `scripts/phoenix-loop-caption-sweep.ts`. The
  phoenix-loop retry shape is intentionally dropped; the DSL's
  `retry max N` plus a user-defined gate is the modern equivalent and
  easier to reason about.

### 4.8 doctor

- name: doctor
- purpose: Full system health check: environment, dependencies, model
  cache, vendor assets, recent run health, and config drift.
- inputs:
  - profile: string, optional.
  - fix: bool, optional (default false). If true, applies a limited set
    of auto-fixes (e.g. re-link placeholders, clear stale tmp).
- outputs:
  - `runs/<run-id>/doctor.json`: structured report.
  - `runs/<run-id>/doctor.md`: human summary with suggested actions.
- skills called:
  - `env-probe`
  - `model-cache-probe`
  - `ffmpeg-probe`
  - `vendor-probe`
  - `config-validate`
  - `run-history-scan`
  - `auto-fix` (only when `fix: true`)
- control flow: Spawn probes in parallel (concurrency 4, they are all
  read-only) and await all. If `fix: true`, after the report is written,
  call `auto-fix` sequentially on each flagged item, then re-run the
  relevant probe to confirm the fix. Retry max 1 on auto-fix (auto-fixes
  are not supposed to flake; if they do, surface the error verbatim).
- completion gates: `file-exists(runs/<run-id>/doctor.json)` AND
  `doctor.severity <= warn` (inline predicate over the report) OR
  `fix: true` AND `doctor.post-fix.severity <= warn`.
- failure modes:
  - A probe times out: report marks that probe as `unknown`; overall
    severity is at least `warn` until the probe is rerun.
  - Auto-fix worsens state (rare, e.g. clearing a cache while a build is
    running): flow marks the run `needs-attention` and does not claim
    success.
  - Read-only environments (no write perms): `fix: true` is rejected at
    input time, not mid-run.
- parallelism: `spawn`, concurrency 4.
- phase: Phase 4 wave 1.
- status: planned.
- notes: Replaces `src/cli/commands/doctor.ts`. Doctor is deliberately
  separate from `preflight-check`; preflight is fast and run-blocking,
  doctor is thorough and operator-driven.

### 4.9 vendor-refresh

- name: vendor-refresh
- purpose: Refresh vendored third-party assets (models, fixtures,
  placeholders) from their declared sources with integrity checks.
- inputs:
  - targets: list of vendor ids, optional (default: all).
  - force: bool, optional (default false).
- outputs:
  - `vendor/<target>/` contents updated in place.
  - `runs/<run-id>/vendor-refresh.json`: per-target status, hashes,
    source urls.
- skills called:
  - `vendor-resolve`
  - `vendor-download`
  - `vendor-verify`
  - `vendor-install`
- control flow: `foreach-spawn` over targets with concurrency ceiling 4
  (network-heavy). Each child runs `vendor-resolve` -> `vendor-download`
  with `retry max 3` and resumable downloads where supported ->
  `vendor-verify` (hash and signature if available) -> `vendor-install`
  (atomic move into place). If `force: false` and the local hash
  matches the manifest, the child short-circuits after `vendor-resolve`.
- completion gates: `file-exists(runs/<run-id>/vendor-refresh.json)` AND
  every target is `status: ok` or `status: unchanged` AND no target has
  `hash-mismatch`.
- failure modes:
  - Network failure mid-download: retry with resume; after 3 attempts,
    target is marked `failed` and the flow fails the gate.
  - Hash mismatch: hard fail for that target; never installed.
  - Partial install (target downloaded but install step aborted): the
    atomic move is the boundary; if it did not happen, the old files
    remain untouched.
- parallelism: `foreach-spawn`, ceiling 4.
- phase: Phase 4 wave 2.
- status: planned.
- notes: Replaces `scripts/vendor.sh` and `scripts/vendor.ps1`. The two
  shell scripts diverge subtly in what they pin; the flow is the single
  source of truth from Phase 4 onward.

### 4.10 regenerate-fixtures

- name: regenerate-fixtures
- purpose: Regenerate deterministic test fixtures (canonical scripts,
  canonical renders, golden evaluation outputs) from the current
  pipeline, for use in unit and integration tests.
- inputs:
  - fixture-set: string, required (e.g. `canonical`, `edge-cases`,
    `showcase`).
  - allow-drift: bool, optional (default false). If true, writes new
    fixtures even when they differ from the previous committed set.
- outputs:
  - `test/fixtures/<fixture-set>/**/*`: regenerated files.
  - `runs/<run-id>/fixture-diff.json`: what changed vs the committed
    baseline.
- skills called:
  - `fixture-plan`
  - `generate-short` (sub-flow, per fixture case)
  - `fixture-diff`
  - `fixture-write`
- control flow: `fixture-plan` enumerates cases. Then `foreach-spawn`
  over cases with concurrency ceiling 4. Each child runs
  `generate-short` with a pinned seed and pinned model manifest. Parent
  runs `fixture-diff` against the committed baseline. If `allow-drift`
  is false and the diff is non-empty, the flow fails and does not write.
  If true (or no baseline exists), `fixture-write` commits the new
  fixtures.
- completion gates: `file-exists(runs/<run-id>/fixture-diff.json)` AND
  (`allow-drift == false` AND `fixture-diff.empty == true`) OR
  (`allow-drift == true` AND `fixture-write.ok == true`) AND
  `tests-pass-gate` on the fixture consumer tests after write.
- failure modes:
  - Non-deterministic output despite pinned seed: diff is non-empty;
    flow fails; operator investigates the source of non-determinism.
  - Pinned model manifest references a missing model: preflight catches
    this; if somehow missed, `generate-short` fails and the case is
    marked.
  - `allow-drift: true` in release checks by mistake: gated by a
    separate local check that forbids that flag in release profiles.
- parallelism: `foreach-spawn`, ceiling 4.
- phase: Phase 4 wave 3.
- status: planned.
- notes: This is the bridge between flows and the test suite. It
  partially replaces the ad-hoc fixture regeneration currently done by
  hand against `src/cli/commands/generate.ts`.

### 4.11 showcase-replay

- name: showcase-replay
- purpose: Replay a committed showcase spec (inputs plus expected
  artifact fingerprints) and verify that the current pipeline still
  reproduces it within tolerance.
- inputs:
  - showcase-id: string, required (resolves to
    `evaluations/showcase-<id>.json`).
  - tolerance-profile: string, optional (default `strict`).
- outputs:
  - `runs/<run-id>/showcase/<showcase-id>/run/`: the produced artifacts.
  - `runs/<run-id>/showcase/<showcase-id>/compare.json`: per-artifact
    match status.
  - `runs/<run-id>/showcase/<showcase-id>/report.md`.
- skills called:
  - `showcase-load`
  - `generate-short` (sub-flow)
  - `artifact-fingerprint`
  - `compare-fingerprints`
  - `report-render`
- control flow: Sequential: load the showcase spec, run the sub-flow
  with pinned inputs, fingerprint every produced artifact, compare to
  the spec's expected fingerprints under the chosen tolerance profile,
  render a report. No retry on the sub-flow (we want a single
  deterministic attempt); retry max 1 on fingerprint if a file handle
  race is suspected.
- completion gates: `file-exists(compare.json)` AND
  `compare.status in {match, within-tolerance}` AND
  `file-exists(report.md)`.
- failure modes:
  - Fingerprint mismatch outside tolerance: flow exits non-zero; report
    flags which artifact drifted and by how much.
  - Showcase spec references artifacts the current pipeline no longer
    produces: flow fails at load time with a spec-migration hint.
  - Timestamp-embedded artifacts defeat fingerprinting: tolerance
    profile normalises timestamps; `strict` does not, and is expected to
    be used only for frozen releases.
- parallelism: None.
- phase: Phase 4 wave 3.
- status: planned.
- notes: Replaces the ad-hoc replayers around `evaluations/showcase-*.json`.
  This flow is intended to run in local release checks.

## 5. Replaces table

The left column is the flow. The right columns name the existing
content-machine surfaces the flow replaces or subsumes. When a surface is
only partially replaced, the note column explains the boundary.

| flow                     | replaces                                                                                                                                                            | notes                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| preflight-check          | `src/cli/commands/generate-preflight.ts`, doctor-lite path inside `doctor.ts`                                                                                       | The fast, run-blocking subset; full doctor stays separate.                 |
| generate-short           | `src/cli/commands/generate.ts`, `generate-output.ts`, `generate-quality.ts`, `generate-sync.ts`, `generate-defaults.ts`, orchestration in `src/workflows/runner.ts` | The CLI wrappers collapse into flow input binding.                         |
| parallel-script-variants | script-variant logic currently inside `src/workflows/runner.ts` and `src/cli/commands/script.ts`                                                                    | Extracted so it is composable under `generate-short` and `lab-sweep`.      |
| parallel-visual-search   | `src/cli/commands/visuals.ts`, search fan-out in `src/workflows/runner.ts`                                                                                          | Per-provider adapters stay in skills.                                      |
| evaluate-batch           | `src/cli/commands/evaluate.ts`, batch parts of `evaluations/showcase-*.json` replayers                                                                              | Single-run evaluation is inside `generate-short`; this flow is batch only. |
| lab-sweep                | `src/cli/commands/lab.ts`                                                                                                                                           | The tuning-loop retry budget (max 5) is explicitly called out.             |
| caption-sweep            | `scripts/phoenix-loop-caption-sweep.ts`                                                                                                                             | Phoenix-loop retry shape replaced by `retry max N` plus gate.              |
| doctor                   | `src/cli/commands/doctor.ts`                                                                                                                                        | The `fix: true` subset is new and guarded.                                 |
| vendor-refresh           | `scripts/vendor.sh`, `scripts/vendor.ps1`                                                                                                                           | The two shell scripts are retired; the flow is the canonical path.         |
| regenerate-fixtures      | ad-hoc regeneration against `src/cli/commands/generate.ts`                                                                                                          | New surface; no pre-existing single replacement.                           |
| showcase-replay          | showcase replayers around `evaluations/showcase-*.json`                                                                                                             | The JSON specs remain; the replayer becomes this flow.                     |

Surfaces explicitly out of scope for this catalogue:

- `src/cli/commands/mcp.ts`, `telemetry.ts`, `init.ts`, `config.ts`: these
  stay as CLI commands in Phase 4. They are control-plane, not
  pipeline, and do not benefit from the flow layer.
- `src/cli/commands/render.ts` stand-alone usage: still callable directly
  as a skill (`video-render`); the flow layer only wraps it when it is
  part of a larger pipeline.

## 6. Gate vocabulary

### 6.1 Built-in prompt-language gates used

- `tests-pass-gate`: wraps a test command; passes on exit code 0.
- `lint-pass-gate`: wraps a lint command; passes on exit code 0.
- `file-exists`: predicate over a path.
- `diff-nonempty`: true when two named artifacts differ non-trivially.
- Composites: `all(...)`, `any(...)`, `2_of(...)` for quorum gates.

These cover the structural gates (did the flow produce the expected
files; do the shipped tests still pass; did we actually change
something).

### 6.2 Content-machine domain gates (to be defined)

These are user-defined gates expected to live in a repo-local
`gates.yaml` (preferred) or inline as
`ask "<predicate>" grounded-by "<cmd>"` expressions when a gate is
single-use.

- `preflight-pass-gate`: preflight.json has `ok == true`.
- `hook-strength-threshold`: evaluation.json `hook_strength >= X`, with X
  defaulted per archetype.
- `sync-score-ok`: audio-video sync score above threshold.
- `caption-qa-pass`: caption-qa.json has `pass == true` and no
  blocking-severity findings.
- `retention-curve-ok`: batch-level retention curve is monotonically
  non-increasing within tolerance.
- `risk-score-bounded`: risk report stays inside configured bounds for
  the selected archetype.

See open question 9.1 for the contract and discovery model for
user-defined gates in prompt-language.

### 6.3 Inline `ask ... grounded-by` fallback

When a predicate is genuinely single-use, flows may inline:

    ask "is preflight.ok true?" grounded-by "jq .ok runs/<run-id>/preflight.json"

This is explicitly allowed and preferred over growing `gates.yaml` with
one-off entries. If the same inline predicate appears in three flows,
promote it to a named gate.

## 7. Concurrency budget

Assumed concurrency ceilings, per flow category:

- Heavy flows (each child runs an LLM call chain or a full render): 4.
  Flows: `parallel-script-variants`, `parallel-visual-search` outer,
  `lab-sweep`, `vendor-refresh`, `regenerate-fixtures`.
- Light flows (each child is read-only or CPU-bound only): 8. Flows:
  `evaluate-batch`, `caption-sweep`.
- Intra-child concurrency where applicable: 4 (matches harness default).

Rationale:

- Local workstations during development typically have 1 GPU and 8 to 16
  CPU cores. 4 heavy children saturates the GPU path for LLM inference
  and keeps one core free for the harness. 8 light children comfortably
  fits in CPU-only paths.
- Smaller machines need lower ceilings. Local profile overrides are
  expected via a `concurrency.local.yaml` profile; see open question 9.3.
- Network-bound flows (`vendor-refresh`, `parallel-visual-search`) are
  capped at 4 irrespective of CPU because provider rate limits, not
  local compute, are the bottleneck.
- These are ceilings, not targets. The runtime scheduler may go lower
  based on measured backpressure.

## 8. Phase mapping

Phase 4 wave 1 (the first to land, gating everything else):

- `preflight-check`
- `generate-short`
- `doctor`

Wave 1 justification: preflight and doctor unblock environment parity,
and generate-short is the smallest end-to-end proof that the flow layer
can replace the CLI's orchestration work.

Phase 4 wave 2 (parallelism and batch):

- `parallel-script-variants`
- `parallel-visual-search`
- `evaluate-batch`
- `vendor-refresh`

Wave 2 introduces the first real spawn/await patterns and the first
batch flow. Vendor-refresh is here (not wave 1) because it depends on
network primitives and the `vendor-verify` skill which lands in Phase 3.

Phase 4 wave 3 (tuning, sweeps, golden paths):

- `lab-sweep`
- `caption-sweep`
- `regenerate-fixtures`
- `showcase-replay`

Wave 3 needs sub-flow composition (`lab-sweep` and `regenerate-fixtures`
both invoke `generate-short` as a sub-flow) and the fixture/showcase
infrastructure which is also arriving in Phase 3.

Skill dependency summary:

- `preflight-check` depends on: `env-probe`, `model-cache-probe`,
  `ffmpeg-probe`, `config-validate`.
- `generate-short` depends on: `classify`, `script-generate`,
  `visual-search`, `visual-select`, `caption-generate`,
  `caption-quality-gate`, `video-render`, `evaluate-short`.
- `doctor` depends on all probes plus `vendor-probe`, `run-history-scan`,
  and `auto-fix`.
- Waves 2 and 3 depend on the wave-1 skill set plus `script-score`,
  `script-select`, `visual-rank`, `report-render`, `curve-fit`,
  `decision-render`, `caption-select`, `vendor-*`, `fixture-*`,
  `showcase-load`, `artifact-fingerprint`, `compare-fingerprints`.

The authoritative skill list and their input/output contracts are in
`04-skill-catalog.md`; this document only names them.

## 9. Open questions

### 9.1 User-defined gates in prompt-language

The catalogue assumes prompt-language supports user-defined gates via a
repo-local manifest (`gates.yaml`) discovered by convention, in addition
to the inline `ask ... grounded-by` form. The SDK guide does not yet
ratify the manifest path. If the SDK lands with only the inline form,
the domain gates in section 6.2 must be expressed as inline predicates
in every flow, which creates duplication and subtle drift risk.

Proposed resolution: confirm with the prompt-language owners that a
`gates.yaml` in the flow root is a supported discovery path, or accept
duplication and add a lint rule that flags divergent inline gate
predicates across flows.

Uncertainty: moderate. The feature is plausible and idiomatic but not
confirmed at time of writing.

### 9.2 Resumability under partial outputs

Several flows (`parallel-script-variants`, `parallel-visual-search`,
`evaluate-batch`, `vendor-refresh`, `regenerate-fixtures`) produce
partial outputs when a subset of children succeed. Two questions:

- Does prompt-language's run-directory model support resume-from-partial
  natively, or do we need per-skill idempotency keys to make resume
  safe?
- On resume, should a flow skip completed children based on the presence
  of their output files, or based on a manifest written by the parent?

Leaning: parent-written manifest (`runs/<run-id>/progress.json`) is more
robust than file-presence heuristics because artifacts can be
half-written. This implies every parallel flow must write progress
atomically after each child returns.

Uncertainty: moderate. Needs a small spike before wave 2.

### 9.3 Local concurrency ceiling

Section 7 asserts that smaller local machines may need a lower ceiling
than workstation defaults. Open questions:

- What is the default local low-resource profile?
- Should low-resource concurrency live in a `concurrency.local.yaml`
  profile consumed by the harness, or as an env override
  (`CM_CONCURRENCY_HEAVY=2`)?
- Do release checks need a separate gate profile that tightens the
  domain gates?

Leaning: profile file, discovered by env (`CM_PROFILE=ci`), with explicit
overrides for ceilings and gates. Do not rely on ambient env vars alone;
they are hard to audit.

Uncertainty: low on the mechanism, moderate on the exact numbers.

### 9.4 Minor open items

- Whether `generate-short` should internally invoke
  `parallel-script-variants` when `n-variants > 1`, or whether the
  caller is expected to orchestrate that explicitly. Current decision:
  caller-orchestrated in wave 1; reconsider in wave 2.
- Whether `showcase-replay` should fingerprint the render byte-for-byte
  or via a perceptual hash. `strict` profile says byte-for-byte;
  `perceptual` profile would need a new skill.
- Whether `doctor --fix` should be a separate flow (`doctor-fix`) to
  keep the read-only path obviously safe. Current decision: single flow
  with a guarded input; revisit if operator confusion shows up.

## 10. Handoff

The structure is stable enough to hand off:

- To implementation: `generate-short` and `doctor` are the first two
  flows to scaffold in `content-machine/flows/`, paired with their wave-1
  skills.
- To the skill catalogue owner (`04-skill-catalog.md`): confirm every
  skill named in section 4 exists with a stable JSON contract, and that
  names match exactly.
- To the runtime view writer: section 7 (concurrency) and section 9.2
  (resumability) feed the runtime view; the deployment view depends on
  the local profile decision in 9.3.
- To the ADR writer: the three load-bearing decisions worth capturing as
  ADRs are (a) flows replace the orchestration parts of the CLI, (b)
  user-defined gates live in `gates.yaml`, (c) concurrency profiles are
  file-based, not env-only.

Next recommended skill: `adr-writer`, starting with the
flows-replace-CLI-orchestration decision, because that is the
assumption every other artifact in this catalogue depends on.
