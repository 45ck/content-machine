# TASK-033-feature: Curated Workflows

**Type:** Feature  
**Priority:** P2  
**Estimate:** M  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** In Progress

---

## Feature Description

**Goal:** Ship curated built-in workflows and add workflow scaffolding.

## Acceptance Criteria

- [x] Given `cm workflows list`, then built-in workflows appear.
- [x] Given `cm workflows new <id>`, then it scaffolds a valid `workflow.json`.
- [x] Given `cm generate --workflow <builtin> --mock`, then it runs without external keys.

## Verification Notes

- Built-in workflows now ship from `assets/workflows/` and resolve through `src/workflows/resolve.ts`.
- `cm generate` supports workflow-driven image motion defaults via `--visuals-motion-strategy`.
- Verified with targeted workflow/generate/pipeline tests plus `tsc --noEmit` and `check-ubiquitous-language`.
- Manual QA review set was rebuilt with real Kokoro audio and balanced evaluation passes:
  - `output/qa-manual-20260306/review-set-real-audio/`
- Follow-up evaluator hardening shipped in:
  - `b9d1d90` `Fix audio quality metrics for silent media`
  - `28ad395` `Add regression coverage for audio quality script`
- Work is committed and pushed on branch `publish-gemini-demo`; task remains `In Progress` until merged to `origin/master` per task policy.

## Required Documentation

- [x] `docs/dev/features/feature-curated-workflows-20260207.md`

## Related

- `docs/dev/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-03-06
