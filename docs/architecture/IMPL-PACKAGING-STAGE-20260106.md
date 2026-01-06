# Implementation Plan: Packaging Stage (`cm package`) as a First-Class Artifact

**Date:** 2026-01-06  
**Status:** Proposed (implementation-ready)  
**Primary Goal:** Add a packaging-first stage that produces title/thumbnail/hook-text variants and enforces the SOP “scrap if you can’t package it” rule.

---

## 1) Why this is a stage (not just prompt text)

The SOPs treat _packaging_ as the performance ceiling. In content-machine terms, packaging is:

- an **artifact** you can A/B test,
- a **gate** you can enforce (clarity/one-sentence premise),
- **context** you can feed into `cm script`, `cm visuals`, and `cm render`.

See: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`.

---

## 2) CLI Surface

```bash
cm package "Redis vs PostgreSQL" --archetype versus -o packaging.json
cm script --topic "Redis vs PostgreSQL" --packaging packaging.json -o script.json
```

Notes:

- `cm package` can also run _inside_ `cm script` for single-command UX, but keeping it separate enables iteration and A/B workflows.

---

## 3) Artifact Contract (`packaging.json`)

Minimum viable fields:

- `selected`: the chosen package
- `candidates[]`: alternates for A/B
- `gate`: pass/fail + reasons (scrap rule)
- `keywords`: SEO keyword set (for `cm publish` later)

Implementation-first approach:

- Start as its own Zod schema (so CLI tooling can rely on it), and reference it from `script.json` via `extra.virality.packagingRef`.

---

## 4) Generation Strategy (agentic without an agent framework)

Use 2–3 deterministic, small LLM calls inside `cm package`:

1. **Candidate generation:** 8–12 title + thumbnail-text variants.
2. **Self-filter:** remove unclear/complex packages (global readability).
3. **Selector:** pick best package for the target archetype + platform.

This follows the “multi-call director” pattern proposed in `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md` without introducing an agent runtime.

---

## 5) Retrieval + Similarity (optional but high leverage)

Use retrieval memory to:

- retrieve exemplar packages for the same archetype/topic cluster,
- detect near-duplicate packages across the last N generations.

Start with a simple in-memory embedding index; keep a backend interface that can be swapped to FAISS later.

References:

- `docs/research/quality-gates/FAISS-20260106.md`
- `docs/architecture/IMPL-RETRIEVAL-MEMORY-FAISS-20260107.md`

---

## 6) Quality Gates (Layer 2 + optional Layer 3)

Layer 2 (deterministic):

- Title length bounds and _simple vocabulary_ heuristic.
- One clear subject + one clear promise (“what happens” in <1 sentence).
- Thumbnail text <= N chars and readable on mobile.

Layer 3 (LLM-as-judge, optional):

- “Clickable clarity” score
- “Curiosity gap without deception” score
- “Policy risk” score (rage-bait/open-loop warnings)

V&V reference: `docs/guides/VV-FRAMEWORK-20260105.md`.

---

## 7) Implementation Steps (TDD)

1. Add/confirm `PackagingOutput` Zod schema and unit tests.
2. Implement `generatePackaging()` with injected `LLMProvider` and fixture tests (fake provider).
3. Add gating checks and tests (red→green).
4. Wire CLI flags (`--archetype`, `--platform`, `--json`, `-o`).

---

## 8) References

- SOP mapping: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- Retrieval gate research: `docs/research/quality-gates/FAISS-20260106.md`
