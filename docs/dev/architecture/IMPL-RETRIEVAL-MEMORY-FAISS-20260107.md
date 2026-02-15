# Implementation Plan: Retrieval Memory (FAISS-backed, optional) for Search + Gates

**Date:** 2026-01-07 (aligned to `tasks/todo/TASK-013-feature-semantic-search-pipeline-20260107.md`)  
**Status:** Proposed (implementation-ready plan) (see `docs/research/quality-gates/FAISS-20260106.md`)  
**Primary Goal:** Add retrieval primitives that support (1) semantic search and (2) similarity/diversity quality gates (see `docs/research/quality-gates/FAISS-20260106.md`).

---

## 1) Working Backwards (PR/FAQ)

We add a retrieval index so content-machine can retrieve exemplars (hooks, beat plans, caption styles) and measure “too-similar” outputs across variants (see `docs/research/quality-gates/FAISS-20260106.md`).  
We treat retrieval as infrastructure and not as a model, and we keep it compatible with both lightweight JS implementations and FAISS as a later backend swap (see `docs/research/quality-gates/FAISS-20260106.md`).  
We align retrieval-augmented patterns with the ideas in SKAPP and RAGTrans while avoiding their training-time dependency stacks in production (see `vendor/research/virality-prediction/skapp` and `vendor/research/virality-prediction/RAGTrans`).

---

## 2) Scope

### In Scope

Implement a “retrieval memory” artifact store that can index embeddings plus metadata for scripts, packaging, and visuals (see `docs/research/quality-gates/FAISS-20260106.md`).  
Implement a similarity/diversity gate that flags near-duplicates across the last N generated variants (see `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).  
Implement a semantic-search CLI surface as described by `tasks/todo/TASK-013-feature-semantic-search-pipeline-20260107.md`.

### Out of Scope

We do not require FAISS in the first implementation and we instead define an interface boundary so the backend can be swapped (see `docs/research/quality-gates/FAISS-20260106.md`).  
We do not ship large external datasets or research model checkpoints as part of retrieval memory (see `vendor/research/virality-prediction/` and `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).

---

## 3) Inputs and Data Model

We index the serialized “hook” string, title variants, and beat plan text from script artifacts produced by `cm script` (see `docs/dev/architecture/IMPL-PHASE-1-SCRIPT-20260105.md`).  
We index captions and timing summaries derived from `timestamps.json` to enable “caption similarity” checks (see `docs/dev/architecture/IMPL-PHASE-2-AUDIO-20260105.md`).  
We index keywords/scene descriptors from `visuals.json` to enable cross-video visual diversity checks (see `docs/dev/architecture/IMPL-PHASE-3-VISUALS-20260105.md`).

---

## 4) Architecture

### 4.1 Retrieval abstraction

We define a `RetrievalIndex` interface with `upsert()`, `search()`, and `stats()` so multiple backends can implement it (see `docs/research/quality-gates/FAISS-20260106.md`).  
We store index metadata in a config-driven location (workspace cache) consistent with the config system approach (see `docs/dev/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md`).

### 4.2 Embedding strategy

We choose embedding models and dimensionality based on the embedding model selection investigation (see `docs/research/investigations/RQ-06-EMBEDDING-MODEL-SELECTION-20260104.md`).  
We keep the embedding pipeline consistent with keyword extraction and visual-to-keyword mapping patterns (see `docs/research/investigations/RQ-05-VISUAL-TO-KEYWORD-20260104.md`).

---

## 5) Quality Gates Enabled by Retrieval

We implement a “near-duplicate script” gate that compares current hook/structure embeddings against recent variants and fails above a similarity threshold (see `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).  
We implement a “visual repetition” gate that compares scene descriptors across scenes and flags repeated concepts when diversity is required (see `docs/dev/architecture/IMPL-PHASE-3-VISUALS-20260105.md`).  
We keep thresholds configurable and tied to the quality gate framework so they can be tuned per archetype (see `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).

---

## 6) CLI Surfaces

We implement semantic search commands and artifact-based indexing as described in `tasks/todo/TASK-013-feature-semantic-search-pipeline-20260107.md`.  
We integrate retrieval-backed gates into `cm score` so similarity/diversity becomes a standard proxy dimension when enabled (see `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).

---

## 7) Testing Strategy

We unit test the retrieval interface with a deterministic in-memory backend to ensure stable results (see `docs/dev/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md`).  
We integration test indexing + searching using small fixture artifacts from script/audio/visuals outputs (see `tasks/todo/TASK-016-quality-cli-integration-tests-20260106.md`).  
We add regression tests that ensure “duplicate detection” behavior is stable across schema versions (see `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).

---

## 8) References

The retrieval primitive research and constraints are captured in `docs/research/quality-gates/FAISS-20260106.md`.  
The retrieval-augmentation research inspiration comes from `vendor/research/virality-prediction/skapp` and `vendor/research/virality-prediction/RAGTrans` as summarized in `docs/research/virality-prediction/REPO-CATALOG-20260106.md`.  
The semantic search feature surface is tracked in `tasks/todo/TASK-013-feature-semantic-search-pipeline-20260107.md`.
