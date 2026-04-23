# 03 — Reorganisation Synthesis

**Status:** Active — ratified 2026-04-22.

This document consolidates the output of the prior planning agents (repo
audit, research cross-pack audit, canonicalisation audit, boundaries
pass, prompt-language coupling review, skill-catalogue draft, flow
catalogue draft, and phase sequencer) into one authoritative synthesis.
Every subsequent phase document and implementation ticket references
this file. Where a prior DIRECTION doc says less, this synthesis
extends it; it does not contradict ratified phase headers.

Upstream references:

- Epic: beads `content-machine-7tf` (run `bd show content-machine-7tf`).
- Elevator pitch: [`../../DIRECTION.md`](../../DIRECTION.md).
- North star and stance: [`00-overview.md`](00-overview.md).
- Layer boundaries: [`01-boundaries.md`](01-boundaries.md).
- Initial keep/move/deprecate cut: [`02-keep-move-deprecate.md`](02-keep-move-deprecate.md).
- Phase headers: [`phases/phase-0-freeze-and-classify.md`](phases/phase-0-freeze-and-classify.md) through [`phases/phase-6-story-rewrite.md`](phases/phase-6-story-rewrite.md).
- Originating findings: [`../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md`](../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md).

---

## 1. North star

Content Machine stops being a CLI-shaped AI content agent. It becomes a
**skills library plus typed contracts plus a deterministic media
runtime**, orchestrated by **prompt-language flows**, and loaded into
coding harnesses (Claude Code, Codex, OpenCode). The durable product is
the skill surface and the runtime it wraps, not a repo-owned control
plane. MCP is one optional adapter; the CLI is a thin dev/CI shell whose
fate is decided in Phase 5 on evidence.

## 2. Target architecture

One layer per row. Dependencies flow downward only. Nothing below a row
may import upward.

| Layer           | Path                                                              | Owns                                                                      | Depends on                                            |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Flows           | `flows/*.flow`                                                    | prompt-language compositions of skills and scripts                        | skills, scripts                                       |
| Skills          | `skills/<name>/SKILL.md` + `scripts/`, `references/`, `examples/` | playbook intelligence, invocation contract, JSON-stdio subprocess surface | adapters (optional), runtime (via scripts), contracts |
| Harness scripts | `scripts/harness/`                                                | deterministic entry points the harness invokes (also `cm-skill` shim)     | runtime, contracts, infra                             |
| Adapters        | `src/adapters/{llm,tts,asr,visuals,mcp}`                          | external bridges, vendor SDK wrapping, MCP server if retained             | contracts, infra                                      |
| Runtime         | `src/runtime/{videospec,media,scoring,features,remotion}`         | deterministic media core: ffmpeg, scoring, feature extraction, render     | contracts, infra                                      |
| Infra           | `src/infra/{logger,config,errors,retry,events}`                   | cross-cutting glue                                                        | contracts (types only)                                |
| Contracts       | `src/contracts/`                                                  | zod schemas, JSON schema, SQL, pure typed API                             | none at runtime                                       |
| CLI (thin)      | `src/cli/`                                                        | at most 3–4 surviving commands after Phase 5                              | runtime, contracts, infra                             |
| Archive         | `archive/legacy-cli/`                                             | frozen reference; excluded from npm artifact                              | n/a                                                   |

Top-level additions: `skills/` (~35 SKILL.md bundles), `flows/` (10
files), `scripts/{harness,dev,ops,gen,quality,python}/`,
`docs/research/external/imports-20260422/` (source research; skills
cite, they do not bundle).

Disallowed back-edges that Phase 2 must remove:

- `src/cli/runtime.ts` and `setCliRuntime()` — runtime reading CLI
  globals is a layering violation.
- `src/videospec/` and `src/videointel/` being siblings — they merge
  into `src/runtime/videospec/`.

## 3. Canonical decisions

The following decisions are treated as ratified. They are the source of
truth for later phases; amendments require a new direction doc, not an
ad-hoc override.

1. **Product shape.** content-machine is a skills library plus typed
   contracts plus a deterministic media runtime, composed by
   prompt-language flows and loaded by harnesses.
2. **Top-level layout.** The table in section 2 is the target. Deviation
   requires an ADR referencing this doc.
3. **prompt-language coupling = Option A.** content-machine takes a
   runtime dependency on `@45ck/prompt-language`. The thin `cm` shell
   (if retained) shells out to flows; skills can be invoked directly
   without it.
4. **Skill shape.** Each skill is a directory with a `SKILL.md` whose
   YAML frontmatter contains `name`, `description` (≤1024 chars),
   `allowed-tools`, `model: inherit`, and `argument-hint`. Optional
   `references/`, `scripts/`, `examples/` siblings. Skills are JSON
   stdio subprocesses invokable as `cm-skill <name>`. One shape works
   across Claude Code, Claude Agent SDK, and prompt-language.
5. **Archive policy.** `archive/` is frozen. Not npm-published
   (excluded via `package.json` `files`), not in CI, carries a
   `README.md` at its root explaining the freeze and where to look
   instead. See section 7.
6. **Excluded from integration.**
   `../imports-20260421/viral_video_research_system_v4/` is superseded
   by v6 and retained only for provenance. Pack 2
   `shortform_algorithm_export/` in `imports-20260422/` is subsumed by
   Pack 3 v6 and is research history, not a runtime source.
7. **Archive targets (Phase 4+, not Phase 0).** `src/workflows/`,
   `src/lab/`, `src/demo/`, `src/research/orchestrator.ts`, top-level
   `templates/`, `tasks/`, `experiments/`, and the `evaluations/*.json`
   fixtures (final disposition TBC).
8. **Critical coupling fix (Phase 2).** Delete `setCliRuntime` and the
   `src/cli/runtime.ts` shim. Runtime becomes ignorant of the CLI.
9. **Runtime merge (Phase 2).** `src/videospec/` + `src/videointel/`
   merge into `src/runtime/videospec/`.
10. **Naming conventions.**
    - "signal model" (Pack 1) over "signal layer" or "scoring layer".
    - "hypothesis registry" (Pack 3 v6) over "hypothesis register" or
      "hypothesis library".
    - Overlay taxonomy uses Pack 5 codes: COD, PRT, SCCF, BCC, ASOE.
11. **~35 skills** listed in section 9.
12. **10 flows** listed in section 9.
13. **Phase plan** is section 6; Phase 0 does not move files, extract
    contracts, delete CLI surface, or author skills — see section 11.

## 4. Quality-attribute drivers

Each decision is traceable to a quality attribute scenario. Summary form
(stimulus -> response -> measure):

- **Modularity.** Harness imports a skill -> skill resolves without
  pulling CLI or adapter code -> dep graph shows zero edges from
  `skills/` into `src/cli/`.
- **Determinism.** Runtime invoked on identical inputs -> identical
  artifact hash -> golden fixture parity in CI, no network reads.
- **Replaceability of adapters.** Swap an LLM vendor -> only
  `src/adapters/llm/` changes -> zero diff in `src/runtime/` or
  `skills/`.
- **Harness portability.** Same SKILL.md loaded in Claude Code, Agent
  SDK, prompt-language -> invocation succeeds without shape changes ->
  one format, three harnesses, shared invocation tests.
- **Research traceability.** Any scoring claim in a skill -> cites a
  canonical source path in section 5 -> skill review rejects
  uncited thresholds.
- **Archive isolation.** npm pack -> no `archive/` contents -> verified
  by `npm pack --dry-run` in CI.

## 5. Research canonicalisation

Canonical sources per domain. Supporting sources may be cited; excluded
sources are retained only as history.

| Domain                          | Canonical source                                                                                | Supporting                 | Excluded / history                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| Retention math (general)        | Pack 1 `shortform_virality_greybox_system`                                                      | Pack 4 (audio-specific)    | v4 research v6 supersedes                                    |
| Retention math (audio-specific) | Pack 4 `shortform_audio_ai_engineering_export`                                                  | Pack 1                     | —                                                            |
| Hook / scroll-stop              | Pack 1 (19 signal models)                                                                       | Pack 3 v6                  | —                                                            |
| Bandits                         | Pack 7 `autonomous_marketing_agent_math_ai_proof_pack` (contextual, non-stationary, production) | Pack 4 (audio uplift only) | Pack 1 demoted to reference                                  |
| Hypothesis registry             | Pack 3 `viral_video_research_system_v6` (150+ named)                                            | —                          | Pack 2 `shortform_algorithm_export/` subsumed; v4 superseded |
| Audio pipeline                  | Pack 4 (exclusive)                                                                              | —                          | —                                                            |
| Overlays / captions             | Pack 5 `cognitive_overlay_design_final_archive_v12` (ASOE engine, COD/PRT/SCCF/BCC)             | —                          | —                                                            |
| Attribution / fraud             | Pack 6 `manufactured_traction_research_vault_v9_algorithmic_models`                             | —                          | —                                                            |
| Schemas / contracts             | Pack 7 (`101_database_schema_sql.md`, `124_ad_agent_output_schemas_json.md`)                    | —                          | —                                                            |
| Guardrails / policy             | Pack 7 (`123_guardrail_policy_config_yaml.md`)                                                  | —                          | —                                                            |

Skills cite these paths by reference (link or relative path), they do
not bundle the markdown. Imports live at
`docs/research/external/imports-20260422/` and are read-only from the
perspective of skill authoring.

## 6. Phase plan

All phases live under the beads epic `content-machine-7tf`. Each phase
is P0; completing one unblocks the next. Entry and exit criteria are
explicit so a future agent can tell whether the phase is done without
asking the author.

### Phase 0 — Freeze, classify, archive scaffold

- **Goal.** Stop shipping control-plane surface area; classify every
  top-level surface; scaffold the archive; publish this synthesis.
- **Entry.** DIRECTION.md, 00–02 direction docs, and the prior planning
  agents' outputs exist.
- **Exit.**
  - Freeze note in `CHANGELOG.md` and `README.md`.
  - Classification file at `docs/dev/classification-20260422.md`
    covering every top-level `src/` directory and every top-level repo
    folder.
  - `archive/README.md` exists with the freeze statement.
  - This file (`03-reorg-synthesis.md`) merged and linked from both
    `DIRECTION.md` and `docs/direction/README.md`.
  - Skill catalog and flow catalog drafts exist (section 9 suffices as
    inline catalog; dedicated files are optional).
- **Risk.** Drift between this synthesis and the eight prior agent
  outputs if future changes update one without the other. Mitigation:
  this file is the single authoritative synthesis; prior agent outputs
  are inputs, not references.
- **Artifacts produced.** This doc, classification file, archive README,
  CHANGELOG/README freeze notes.

### Phase 1 — Contracts lift

- **Goal.** Lift zod schemas, JSON schema, and SQL into `src/contracts/`
  with zero runtime dependencies.
- **Entry.** Phase 0 exit satisfied.
- **Exit.**
  - `src/contracts/` builds in isolation (no imports from `runtime/`,
    `adapters/`, `cli/`).
  - Schema-stability tests pinning the public shape are green in CI.
  - Runtime, CLI, and one script import from contracts only.
- **Risk.** Hidden type leakage from runtime into contracts via shared
  interfaces. Mitigation: enforce a dep-cruiser (or equivalent) rule
  that `src/contracts/**` may not import from `src/{runtime,adapters,cli,infra}/**`.
- **Artifact.** `src/contracts/` tree, contract tests, dep-rule file.

### Phase 2 — Runtime, adapters, infra carve-out

- **Goal.** Carve `src/runtime/`, `src/adapters/`, `src/infra/`; delete
  `setCliRuntime`; merge videospec + videointel.
- **Entry.** Phase 1 exit satisfied.
- **Exit.**
  - `src/cli/runtime.ts` is deleted; no call-site references.
  - `src/runtime/videospec/` is the single home for videospec +
    videointel.
  - Runtime consumes contracts only; adapters consume contracts + infra
    only.
  - Golden fixtures pass offline (no network).
  - Dependency graph shows no edges from `runtime/` into `cli/`.
- **Risk.** Golden-fixture drift when feature extraction or scoring is
  moved. Mitigation: freeze fixtures before the move; diff artifact
  hashes before and after.
- **Artifact.** Reorganised `src/`, updated public API surface,
  fixture parity report.

### Phase 3 — Harness scripts; CLI gutting

- **Goal.** Author `scripts/harness/*`; reduce the CLI command surface;
  move `src/research/orchestrator.ts` into a skill.
- **Entry.** Phase 2 exit satisfied.
- **Exit.**
  - `scripts/harness/{ingest,render,publish-prep}` or equivalents
    runnable end-to-end in CI on fixtures.
  - `cm-skill` shim installed and wired to JSON-stdio invocation.
  - Research orchestrator exists as a skill, not inside `src/research/`.
  - CLI command count dropped to the pre-Phase-5 minimum.
- **Risk.** CI coverage gap between CLI-invoked paths and
  script-invoked paths. Mitigation: mirror key CLI commands as scripts
  with identical golden traces before removing the CLI command.
- **Artifact.** `scripts/` tree, harness invocation docs, CI workflow.

### Phase 4 — Skills and flows first batch; legacy archive

- **Goal.** Author the first set of skills (section 9) and the first
  flows; archive `src/lab/`, `src/demo/`, `src/workflows/`.
- **Entry.** Phase 3 exit satisfied.
- **Exit.**
  - At least three skills from the list in section 9 shipped under
    `skills/` with invocation tests.
  - At least two flows in `flows/` exercised end-to-end.
  - `archive/legacy-cli/` contains the frozen copies of `src/lab/`,
    `src/demo/`, `src/workflows/` with a pointer in `archive/README.md`.
- **Risk.** Skill descriptions too vague for harness selection.
  Mitigation: invocation tests assert that a realistic harness
  description selects the skill.
- **Artifact.** `skills/` bundles, `flows/` files, archive contents.

### Phase 5 — CLI decision

- **Goal.** Decide keep-thin / keep-full / delete using Phase 4 trial
  evidence.
- **Entry.** Phase 4 exit satisfied; trial window has produced real
  content.
- **Exit.**
  - Trial log at `docs/dev/trial-cli-20260xxx.md`.
  - ADR recorded under `docs/dev/architecture/`.
  - CLI minimised to at most four commands or deleted with migration
    notes, per the recorded decision.
- **Risk.** Sunk-cost bias toward keeping the CLI. Mitigation: the ADR
  must quote counted-in-trial signals, not qualitative preference.
- **Artifact.** Trial log, ADR, reduced CLI surface.

### Phase 6 — Story and docs rewrite

- **Goal.** Rewrite `README.md`, `docs/user/`, `docs/dev/` for a
  harness-first identity; re-scope `src/index.ts` public exports to
  match.
- **Entry.** Phase 5 exit satisfied.
- **Exit.**
  - README opener describes skills + runtime + contracts as the
    product; CLI demoted to a sub-link.
  - `src/index.ts` public exports match the layer boundaries in
    section 2.
  - Deprecated how-tos moved out of user navigation.
- **Risk.** Public API churn for existing consumers (if any).
  Mitigation: maintain deprecated re-exports for one release with
  warnings.
- **Artifact.** Rewritten README, updated `src/index.ts`, navigation
  changes.

## 7. Archive policy

`archive/` is **frozen reference**. Its contents are not actively
maintained, not imported by runtime code, and not distributed in the
npm artifact.

Rules:

- `package.json` `files` field explicitly lists the published paths;
  `archive/**` is excluded.
- CI excludes `archive/**` from lint, test, and type-check runs.
- `archive/README.md` states the freeze, the date, the reason, and
  where the live replacement lives (pointers into `skills/`, `src/`,
  `scripts/`).
- Each archived subtree carries a per-tree `README.md` pointing to the
  live replacement so a reader who lands deep in the tree is not lost.
- No new commits should land in `archive/` except to fix pointers, add
  a tombstone, or remove the tree entirely.
- Removal policy: trees may be deleted after two minor releases without
  a restore request.

Initial archive contents at end of Phase 4: `archive/legacy-cli/`
holding `src/lab/`, `src/demo/`, `src/workflows/`, the original
`src/cli/` (pre-trim), the pre-merge `src/videointel/`, the old
`src/research/orchestrator.ts`, and top-level `templates/`, `tasks/`,
`experiments/` if their disposition is still TBC at that point.

## 8. prompt-language integration contract

prompt-language sits **above** skills and scripts and **below**
harnesses. It composes skills into flows. content-machine depends on
`@45ck/prompt-language` at runtime for flow execution; it does not vend
prompt-language itself.

Responsibilities:

- **prompt-language owns.** Flow parsing, step sequencing, gate
  evaluation, branching, retries between steps.
- **content-machine owns.** Skills, scripts, runtime, contracts, infra.
  Each skill is self-contained and callable without prompt-language.
- **Harness owns.** User intent, model choice, tool permissions,
  conversation.

Skill invocation contract (the `cm-skill` shim):

- **Transport.** Subprocess; JSON on stdin, JSON on stdout, diagnostics
  on stderr.
- **Input envelope.** `{ "skill": "<name>", "args": { ... },
"context": { "cwd": "...", "runId": "...", "env": { ... } } }`.
- **Output envelope.** `{ "ok": true, "result": { ... },
"artifacts": [ { "path": "...", "kind": "..." } ],
"telemetry": { ... } }` or `{ "ok": false,
"error": { "code": "...", "message": "...", "retryable": false } }`.
- **Exit codes.** `0` success, `1` validation error (bad input),
  `2` skill precondition failed, `3` runtime error (retryable),
  `4` permanent failure (not retryable).
- **Auth boundary.** Skills do not read ambient secrets; secrets are
  passed through the `context.env` subset declared in the skill's
  `allowed-tools`. Missing credentials exit with code `1`.
- **Idempotency.** Each invocation receives a `runId` used for artifact
  naming and log correlation. Re-running with the same `runId` may
  short-circuit if a contract-hashed result already exists.
- **Evaluation plan.** Every skill ships an invocation test that
  round-trips a representative input through `cm-skill <name>` and
  asserts envelope shape, exit code, and artifact presence. A nightly
  job replays the flow catalog end-to-end against golden fixtures.

A note on documentation. The prompt-language DSL uses keywords that can
be mistaken for live instructions by meta-prompt detectors. When
describing flow structure in markdown, prefer indented plain text
(4-space indent, no backticks) or a nested YAML sketch that avoids the
literal completion-gate keyword. Illustrative sketch (YAML, no DSL
keywords):

```yaml
flow_name: generate-short
steps:
  - skill: content-brief-generator
  - skill: virality-hook-scorer
  - skill: caption-overlay-generator
  - skill: overlay-qa-gate
completion_gates:
  - tests_pass
  - lint_pass
```

The live DSL form belongs in `flows/*.flow`, not in prose docs.

## 9. Deliverable inventory

What Phase 0 is obliged to produce, one line each:

- `docs/direction/03-reorg-synthesis.md` (this doc) — ratified synthesis
  every later phase references.
- `docs/dev/classification-20260422.md` — line-by-line keep/move/
  deprecate classification of every top-level surface.
- `archive/README.md` — freeze policy, pointers to live replacements.
- `CHANGELOG.md` freeze note — top-of-changelog statement that the
  control plane is frozen.
- `README.md` freeze callout — top-of-readme statement with a link to
  this doc.

Forward-looking catalogs ratified here (deliverable in later phases):

- **~35 skills** (preliminary names; Phase 4 authoring):
  virality-hook-scorer, retention-survival-predictor,
  shareability-psychology-scorer, trend-freshness-evaluator,
  multi-platform-ranker, tts-prompt-compiler, music-selector,
  audio-asset-scorer, sfx-compiler, audio-feature-extractor,
  caption-overlay-generator, overlay-qa-gate,
  accessibility-condition-matcher, overlay-method-ranker,
  visual-load-scorer, manufactured-traction-detector,
  ethics-boundary-checker, traction-risk-scorer, tactic-card-matcher,
  claim-generator-and-vetter, ad-copy-variator, product-brief-loader,
  brand-safety-enforcer, bandit-optimizer,
  campaign-measurement-system, legal-review-orchestrator,
  hypothesis-prioritizer, virality-qa-gate,
  hypothesis-family-navigator, hypothesis-naming-encoder,
  hypothesis-evidence-synthesizer, experiment-protocol-runner,
  content-brief-generator.
- **10 flows** (Phase 4 authoring): generate-short,
  parallel-script-variants, parallel-visual-search, evaluate-batch,
  lab-sweep, caption-sweep, doctor, vendor-refresh,
  regenerate-fixtures, showcase-replay.

## 10. Open questions

Carried forward from the repo audit and integration reviews. Each must
be resolved before the phase that depends on it, not before Phase 0.

1. **`evaluations/*.json` disposition.** Are these fixtures (move to
   `tests/fixtures/`), ground-truth corpora (keep near runtime), or
   dead (archive)? Blocks Phase 2 fixture parity.
2. **`tasks/` safe to delete.** Repo audit flagged it as stale. Confirm
   no live references before Phase 4 archive sweep.
3. **Top-level `templates/` attribution obligations.** If templates
   carry third-party attribution (fonts, footage, style packs), their
   archive path must preserve licence text. Confirm before moving.
4. **Lab real-user check.** `src/lab/` may have active human users
   outside the core team; archiving it without notice is hostile.
   Validate before Phase 4.
5. **MCP server continuation.** Keep shipping an MCP server, deprecate
   it to an optional adapter, or drop entirely. Decide before Phase 5
   so the CLI decision has full context.
6. **prompt-language version pin.** Which version of
   `@45ck/prompt-language` does content-machine take as the minimum?
   Needs a one-line ADR before Phase 3 ships `cm-skill`.

## 11. Explicit non-goals for Phase 0

To prevent scope creep, Phase 0 does **not** do any of the following.
These are owned by later phases and attempting them now breaks the
entry/exit contract above.

- No file moves. Classification records intent; movement happens in
  Phase 2 and Phase 4.
- No CLI command deletion. Phase 5 decides, using trial data that does
  not yet exist.
- No contract extraction. Phase 1 does that; Phase 0 only names where
  contracts will live.
- No skill authoring. Phase 4 writes skills; Phase 0 publishes the
  catalog names only.
- No runtime refactor. No `setCliRuntime` removal, no videospec merge,
  no adapter carve-out. All Phase 2.
- No README rewrite beyond the freeze callout. Phase 6 rewrites the
  story.
- No archive content yet, only the scaffold (`archive/README.md`).
  Legacy trees move in Phase 4.
- No prompt-language dependency bump or `cm-skill` shim. Phase 3.

---

**Amendments.** Changes to this synthesis require a new ADR under
`docs/dev/architecture/` that names the section being amended and the
driver. Do not silently edit a ratified decision; append a dated note
referencing the ADR.
