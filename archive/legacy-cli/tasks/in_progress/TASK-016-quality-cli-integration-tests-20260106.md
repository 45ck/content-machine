# TASK-016: Stabilize CLI Integration Tests

**Type:** Test  
**Priority:** P1  
**Estimate:** M  
**Created:** 2026-01-06  
**Owner:** Unassigned  
**Status:** In Progress

---

## Description

Make CLI integration tests deterministic by ensuring stdout/stderr are reliably captured, mock workflows can run without real inputs, and validation errors surface the expected Fix hints.

---

## Acceptance Criteria

- [ ] Given CLI commands emit human-mode output, when run via integration harness, then stderr output is captured and stdout remains parseable.
- [ ] Given `cm rate --mock --summary`, when the input file is missing, then the command still returns exit 0 and prints a compact summary.
- [ ] Given invalid artifacts for `cm visuals`/`cm render`, when input JSON exists, then validation errors include Fix hints pointing to the correct preceding command.

---

## 📚 Required Documentation

**Pre-Work (read these first):**

- [ ] None

**Deliverables (create these):**

- [ ] None

---

## 🧪 Testing Considerations

**What needs testing:**

- CLI stdout/stderr contract in human mode
- JSON envelope outputs for `--json`
- Mock mode behavior when real assets are missing
- Input validation Fix hints

**Risks:**

- Output loss when commands exit immediately
- Mock paths accidentally skipping validation in real runs

**Dependencies:**

- Integration tests rely on repo-local fixtures and `.cache` directories

---

## 📝 Testing Plan

### Integration Tests

- [ ] `npm run test:run -- tests/integration/cli`
- [ ] `npm run test:run -- tests/e2e/sync-pipeline.test.ts`

---

## Implementation Notes

**Technical approach:**

- Use synchronous stdout/stderr writes for CLI output helpers.
- Update integration helper to run with `node --import tsx` for sandbox compatibility.
- Add minimal `test-fixtures/script.json` for validation tests.
- Skip file existence checks in mock sync rating flow.

**Key files to modify:**

- `src/cli/output.ts`
- `tests/integration/cli/helpers.ts`
- `src/cli/commands/*.ts`
- `src/score/sync-rater.ts`
- `test-fixtures/script.json`

---

## ✅ Verification Checklist

- [ ] All acceptance criteria met
- [ ] Integration tests pass
- [ ] TypeScript compiles with no errors
- [ ] Linting clean
- [ ] Code committed to main branch
- [ ] Manual CLI spot checks complete

---

## Related

**Related Tasks:**

- `tasks/todo/TASK-011-quality-coverage-increase-20260106.md`

---

**Last Updated:** 2026-01-06
