# TASK-029-feature: Template Authoring (New + Preview + Pack)

**Type:** Feature  
**Priority:** P1  
**Estimate:** M  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Make templates easy to create, preview, and share.

**User Story:**

> As a template author,
> I want scaffolding and a preview command,
> So that I can iterate quickly without guessing required fields.

**Value Proposition:**
Templates are the scaling mechanism for formats. Better tooling increases contributions and reduces bugs.

## Acceptance Criteria

- [ ] Given `cm templates new foo`, when it runs, then it creates a valid `template.json` skeleton and directories.
- [ ] Given `cm templates preview <idOrPath>`, when it runs, then it renders a short MP4 deterministically.
- [ ] Given `cm templates pack <dir>`, when it runs, then it produces a zip that `cm templates install` accepts.

## Required Documentation

**Pre-Work (read these first):**

- [ ] `docs/features/feature-video-templates-20260107.md`

**Deliverables (create these):**

- [x] `docs/features/feature-template-authoring-and-preview-20260207.md`
- [ ] `docs/guides/guide-template-authoring-20260207.md`
- [ ] Update `docs/reference/video-templates-reference-*.md` (new commands)

## Testing Considerations

- Determinism is critical to avoid flaky preview tests.
- Templates with required slots (gameplay) must fail with actionable fixes.

## Testing Plan (TDD)

### Unit Tests

- [ ] Scaffolder produces valid schema.
- [ ] Packer enforces layout and rejects unsafe zips.

### Integration Tests

- [ ] Preview renders MP4 for built-ins.

## Technical Design

- Add a preview harness module reused by `templates preview` and tests.

## Verification Checklist

- [ ] Tests pass (`npm test`)
- [ ] Lint/typecheck/format checks pass

## Related

- `docs/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-02-07
