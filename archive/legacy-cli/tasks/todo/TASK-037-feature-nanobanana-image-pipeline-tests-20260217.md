# TASK-037-feature: NanoBanana Image Pipeline Tests + Docs

**Type:** Feature
**Priority:** P1
**Estimate:** S
**Created:** 2026-02-17
**Owner:** Unassigned
**Status:** Todo

---

## Feature Description

**Goal:** Provide a clear, repeatable workflow to generate AI images via Gemini (NanoBanana provider) and render videos with deterministic fallbacks (Ken Burns), plus tests that do not call real APIs in CI.

---

## Acceptance Criteria

- [ ] Given `GOOGLE_API_KEY` (or `GEMINI_API_KEY`), when I run `cm visuals --provider nanobanana`, then it writes a valid `visuals.json` that points at cached local images.
- [ ] Given `--motion-strategy kenburns`, when I run `cm render`, then I can render an MP4 without Veo.
- [ ] Given CI/default runs, when tests execute, then no real image generation calls are made.

---

## 📚 Required Documentation

- [ ] `docs/user/examples/nanobanana-kenburns.md` (end-to-end example)

---

## 🧪 Testing Plan (TDD)

- [ ] Unit tests cover NanoBanana provider caching + request shaping (mocked).
- [ ] Optional real smoke tests gated behind `CM_RUN_REAL_OUTPUT_TESTS=1`.
