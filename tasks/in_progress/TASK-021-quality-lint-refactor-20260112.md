# TASK-021: Refactor to Meet Lint Quality Gates

**Type:** Refactor  
**Priority:** P1  
**Estimate:** L  
**Created:** 2026-01-12  
**Owner:** Unassigned  
**Status:** In Progress

---

## Description

Refactor high-complexity and oversized functions to satisfy ESLint/sonarjs quality gates without relaxing rules.

---

## Acceptance Criteria

- [ ] Given `npm run lint`, when executed, then it exits 0 with no errors.
- [ ] Given refactored functions, when existing tests run, then behavior is unchanged.
- [ ] Given CLI commands, when run in human/JSON modes, then stdout/stderr contracts remain intact.

---

## 📚 Required Documentation

**Pre-Work (read these first):**

- [ ] None

**Deliverables (create these):**

- [ ] None

---

## 🧪 Testing Considerations

**What needs testing:**

- CLI integration suite
- E2E sync pipeline tests
- Any refactored helper units if behavior changes

**Risks:**

- Subtle behavior changes during extraction
- Output formatting regressions

**Dependencies:**

- Keep acceptance criteria in `tasks/in_progress/TASK-016-quality-cli-integration-tests-20260106.md` green

---

## 📝 Testing Plan

### Integration Tests

- [ ] `npm run test:run -- tests/integration/cli`

### E2E Tests

- [ ] `npm run test:run -- tests/e2e/sync-pipeline.test.ts`

### Lint

- [ ] `npm run lint`

---

## Implementation Notes

**Technical approach:**

- Extract complex flows into small, pure helpers.
- Consolidate repeated literal strings into constants.
- Prefer early returns to reduce nesting.

**Key files to modify:**

- `src/cli/commands/*.ts`
- `src/core/pipeline.ts`
- `src/render/service.ts`
- `src/render/captions/*.ts`
- `src/visuals/*.ts`
- `scripts/*.ts`

---

## ✅ Verification Checklist

- [ ] All acceptance criteria met
- [ ] Linting clean (`npm run lint`)
- [ ] Tests pass (`npm run test:run -- tests/integration/cli`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Code committed to main branch

---

**Last Updated:** 2026-01-12
