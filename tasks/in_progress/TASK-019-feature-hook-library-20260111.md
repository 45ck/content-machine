# TASK-019-feature: Hook Library + Transitional Hook Intro

**Type:** Feature
**Priority:** P1
**Estimate:** M
**Created:** 2026-01-11
**Owner:** Unassigned
**Status:** In Progress

---

## Feature Description

**Goal:** Add a hook intro system with a shared transitional hook library and support for user-provided hook clips.

**User Story:**

> As a creator,
> I want to prepend a short hook clip to generated videos,
> So that the first 1–3 seconds are thumb-stopping and consistent.

**Value Proposition:**
Improves early retention by standardizing attention-grabbing intros while keeping the pipeline composable.

---

## Acceptance Criteria

- [ ] Given a hook id, when running `cm generate`, then the hook clip is prepended and audio/captions start after it.
- [ ] Given a local hook path, when running `cm render --hook`, then the hook clip is prepended with correct duration.
- [ ] Given missing hook assets, when running with a hook id, then the CLI surfaces a clear fix message.

---

## Required Documentation

**Pre-Work (read these first):**

- [ ] `docs/architecture/SYSTEM-DESIGN-20260104.md`
- [ ] `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`

**Deliverables (create these):**

- [ ] `docs/features/feature-hook-library-20260111.md`
- [ ] `docs/guides/guide-hook-library-20260111.md`

---

## Testing Considerations

**Happy Path:**

- Hook id resolves to local file and is prepended.
- Local hook path with duration override works.

**Edge Cases:**

- Missing hook file.
- Hook duration missing for remote URL.
- Hook longer than 3 seconds (warn).

**Error Scenarios:**

- ffprobe missing.
- Invalid hook id or bad URL.

---

## Testing Plan (TDD)

### Unit Tests

- [ ] Resolve hook by id (library + hooksDir).
- [ ] Resolve hook by local path with duration override.
- [ ] Missing hook file error.

### Integration Tests

- [ ] Render props accept hook schema.

---

## Implementation Plan

### Phase 1: Foundation

- [ ] Define hook schema + defaults.
- [ ] Add hook resolver and tests.

### Phase 2: Integration

- [ ] Wire hook options into CLI + pipeline.
- [ ] Update Remotion compositions to prepend hooks.

### Phase 3: Polish

- [ ] Add hook sync script.
- [ ] Add docs + examples.

---

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Documentation written (dated)
- [ ] Code committed to main branch

---

## Notes

- Hook timing must preserve the “first-frame contract” (promise matches delivery).
- Keep hook clips <= 3s unless explicitly overridden.

---

**Last Updated:** 2026-01-11
