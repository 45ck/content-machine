# TASK-036-feature: Gemini LLM Smoke Tests + Docs

**Type:** Feature
**Priority:** P1
**Estimate:** S
**Created:** 2026-02-17
**Owner:** Unassigned
**Status:** Todo

---

## Feature Description

**Goal:** Make it easy to validate Google Gemini text (LLM) support end-to-end via `content-machine` without breaking CI.

**User Story:**

> As a developer,
> I want a documented, repeatable way to run Gemini LLM flows (and optionally smoke-test real calls),
> So that I can verify the provider works and regressions are caught early.

---

## Acceptance Criteria

- [ ] Given `GOOGLE_API_KEY` (or `GEMINI_API_KEY`), when I set `[llm] provider="gemini"` and run `cm script`, then it succeeds using Gemini.
- [ ] Given CI/default runs, when tests execute, then no real Gemini API calls are made.
- [ ] Given `CM_RUN_REAL_OUTPUT_TESTS=1`, when smoke tests run locally, then a real Gemini call can be executed (optional and explicit).

---

## 📚 Required Documentation

- [ ] `docs/user/providers/gemini.md` (usage + config + pitfalls)

---

## 🧪 Testing Plan (TDD)

- [ ] Unit tests for Gemini provider behaviors (system message handling, JSON mode, error mapping).
- [ ] Optional real smoke tests gated behind `CM_RUN_REAL_OUTPUT_TESTS=1` and API key presence.

---

## Notes

- Canonical env var names live in `registry/repo-facts.yaml` and are generated into `docs/reference/ENVIRONMENT-VARIABLES.md`.
