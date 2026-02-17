# TASK-038-feature: Veo Media Synthesis Adapter + Docs

**Type:** Feature
**Priority:** P1
**Estimate:** M
**Created:** 2026-02-17
**Owner:** Unassigned
**Status:** Todo

---

## Feature Description

**Goal:** Support Veo image-to-video via the Gemini API long-running operation contract, so NanoBanana keyframes can be animated into clips during `cm media`.

---

## Acceptance Criteria

- [ ] Given `GOOGLE_API_KEY`, when I run `cm media --veo-adapter google-veo` on a visuals artifact containing image scenes with `motionStrategy="veo"`, then it produces synthesized `.mp4` clips and a valid media manifest.
- [ ] Given missing Veo access or API errors, when `cm media` runs, then the manifest records the failure per scene with a useful error message.
- [ ] Given CI/default runs, when tests execute, then no real Veo calls are made.

---

## 📚 Required Documentation

- [ ] `docs/reference/cm-media-reference-20260217.md`
- [ ] `docs/user/examples/nanobanana-veo.md`

---

## 🧪 Testing Plan (TDD)

- [ ] Unit tests for `GoogleVeoAdapter` poll flow and error handling (mocked).
- [ ] Update `cm generate` docs to mention the `cm media` stage for advanced motion strategies.
