# TASK-NNN: [Short Title]

**Type:** [Feature | Bug | Research | Refactor | Docs | Test]
**Priority:** [P0 | P1 | P2 | P3]
**Estimate:** [XS | S | M | L | XL]
**Created:** YYYY-MM-DD
**Owner:** [Name or Unassigned]
**Status:** [Todo | In Progress | Blocked | Done]

---

## Description

[Clear description of what needs to be done and why. Include context and background.]

---

## Acceptance Criteria

Use Given/When/Then format:

- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]

---

## 📚 Required Documentation

**Pre-Work (read these first):**
- [ ] `docs/research/XX-relevant-research-YYYYMMDD.md`
- [ ] `docs/architecture/adr-NNN-relevant-decision-YYYYMMDD.md`

**Deliverables (create these):**
- [ ] `docs/[category]/[name]-YYYYMMDD.md` — [Purpose]
- [ ] Update `docs/[category]/README.md` if needed

---

## 🧪 Testing Considerations

**What needs testing:**
- [List scenarios that need test coverage]
- [Edge cases to consider]
- [Error conditions to handle]

**Risks:**
- [What could go wrong?]
- [What assumptions are we making?]

**Dependencies:**
- [External systems this relies on]
- [Other tasks that must complete first]

---

## 📝 Testing Plan

**CRITICAL:** Write these tests BEFORE writing implementation code (TDD)

### Unit Tests

- [ ] Test [specific function/component]
- [ ] Test [error handling]
- [ ] Test [edge case]

### Integration Tests

- [ ] Test [interaction between components]
- [ ] Test [external API integration]

### E2E Tests (if applicable)

- [ ] Test [full user workflow]

---

## Implementation Notes

**Technical approach:**
[High-level approach, patterns to use, vendored repos to reference]

**Key files to modify:**
- `src/[path]/[file].ts`
- `tests/[path]/[file].test.ts`

**Gotchas:**
- [Things to watch out for]
- [Known issues in dependencies]

---

## ✅ Verification Checklist

**Before moving to `done/`:**

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles with no errors (`pnpm type-check`)
- [ ] Linting clean (`pnpm lint`)
- [ ] All required documentation created (with YYYYMMDD dates)
- [ ] Code committed to main branch
- [ ] CI passed (when CI is implemented)
- [ ] Manual testing completed
- [ ] No hardcoded secrets or API keys
- [ ] Error handling implemented
- [ ] Logging added (no console.log in production)

---

## Related

**Related Tasks:**
- [Link to related tasks]

**Related Docs:**
- [Link to relevant documentation]

**Related ADRs:**
- [Link to architecture decisions]

---

## Notes

[Additional notes, learnings, or context that might be useful later]

---

**Last Updated:** YYYY-MM-DD
