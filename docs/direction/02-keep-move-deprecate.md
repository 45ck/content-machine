# Keep / Move / Deprecate

> **Note:** The authoritative per-file classification now lives in
> [`classification-20260422.md`](classification-20260422.md); this
> document remains the conceptual narrative.

Initial classification from section 10 of the findings doc. Phase 0
(bead `content-machine-7tf.1`) turns this into a line-by-line audit.

## Keep in the core

- Typed content contracts (scripts, scenes, render plans, eval results)
- Deterministic media runtime (TTS orchestration, captions, alignment,
  render/concatenation, QC)
- Evaluation + validation (video quality metrics, archetype checks,
  ground-truth V&V corpus)
- Reverse-engineering substrate (clip-anything-style analyzers,
  creative genome, hypothesis library inputs)
- Fixtures and golden artifacts used by tests

## Move to skills / harness layer

- Topic → brief orchestration
- Research / trend discovery workflows
- Archetype selection heuristics
- Hook/CTA design and rewrites
- Cross-platform packaging decisions
- Post-hoc "what worked" review loops

These become harness skills that call into the runtime for
deterministic steps.

## Deprecate or freeze first

- Repo-owned agentic orchestration loops
- CLI features that duplicate harness capability
- Research commands that duplicate what skills + harnesses already do
- MCP as a primary integration path (demote to optional adapter)
- Docs and examples that sell Content Machine as "the AI agent"

Freeze means: no new features, keep shipping bugfixes until the
replacement lands in the right layer.

## Source

Section 10 and 10.1–10.3 of
[`../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md`](../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md).
