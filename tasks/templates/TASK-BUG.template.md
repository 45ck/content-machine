# TASK-NNN-bug: [Short Bug Description]

**Type:** Bug
**Priority:** [P0 | P1 | P2 | P3]
**Severity:** [Critical | High | Medium | Low]
**Estimate:** [XS | S | M | L]
**Created:** YYYY-MM-DD
**Owner:** [Name or Unassigned]
**Status:** [Todo | In Progress | Blocked | Done]

---

## Bug Description

**Summary:** [One-line description of the bug]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Impact:**
- [ ] Data loss / corruption
- [ ] Feature completely broken
- [ ] Feature partially broken
- [ ] Visual/UX issue
- [ ] Performance degradation

---

## Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observe unexpected behavior]

**Frequency:** [Always | Intermittent | Rare]

**Environment:**
- OS: [Windows / macOS / Linux]
- Node version: [X.X.X]
- Branch: [main / feature-X]

---

## Root Cause Analysis (if known)

**Hypothesis:**
[What you think is causing the bug]

**Evidence:**
- [Stack trace]
- [Log output]
- [Code snippet]

---

## 📚 Required Documentation

**Pre-Work:**
- [ ] `docs/investigations/investigation-[bug-name]-YYYYMMDD.md` (if complex bug)

**Deliverables:**
- [ ] `docs/bugs/bug-NNN-[description]-YYYYMMDD.md` — Bug report
- [ ] `docs/postmortems/incident-[name]-YYYYMMDD.md` (if P0/P1)

---

## 🧪 Testing Considerations

**Regression Test:**
- [ ] Create test that reproduces the bug (should FAIL before fix)
- [ ] Verify test PASSES after fix
- [ ] Add edge cases that could trigger similar bugs

**Related Areas:**
- [What other features might be affected?]
- [Where else is this pattern used?]

---

## 📝 Testing Plan (TDD - Red → Green → Refactor)

### 🔴 RED: Write Failing Test

- [ ] Write test that reproduces the bug
- [ ] Run test (should FAIL)
- [ ] Commit failing test with descriptive name: `test: reproduce bug-NNN [bug description]`

### 🟢 GREEN: Fix the Bug

- [ ] Implement minimal fix
- [ ] Run test (should PASS)
- [ ] Verify no other tests broke

### 🔵 REFACTOR: Improve

- [ ] Clean up code
- [ ] Add edge case tests
- [ ] Verify all tests still pass

---

## Fix Approach

**Proposed Solution:**
[How you plan to fix this]

**Alternative Approaches:**
1. [Alternative 1] - [Pros/Cons]
2. [Alternative 2] - [Pros/Cons]

**Files to Modify:**
- `src/[path]/[file].ts` — [What needs changing]
- `tests/[path]/[file].test.ts` — [Test to add]

---

## ✅ Verification Checklist

**Before moving to `done/`:**

- [ ] Failing test created and committed
- [ ] Bug fix implemented
- [ ] Original failing test now passes
- [ ] No other tests broke (regression check)
- [ ] Manual reproduction steps no longer trigger bug
- [ ] Edge cases tested
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Documentation created (with YYYYMMDD dates)
- [ ] Code committed to main branch
- [ ] CI passed (when CI is implemented)
- [ ] Postmortem written (if P0/P1)

---

## Related

**Related Bugs:**
- [Link to similar bugs]

**Related Docs:**
- [Link to investigation report if created]

**Caused By:**
- [Link to commit/PR that introduced bug, if known]

---

## Notes

**Learnings:**
[What did we learn from this bug?]

**Prevention:**
[How can we prevent this class of bugs in the future?]

---

**Last Updated:** YYYY-MM-DD
