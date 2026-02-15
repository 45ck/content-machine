# TASK-NNN-feature: [Feature Name]

**Type:** Feature
**Priority:** [P0 | P1 | P2 | P3]
**Estimate:** [S | M | L | XL]
**Created:** YYYY-MM-DD
**Owner:** [Name or Unassigned]
**Status:** [Todo | In Progress | Blocked | Done]

---

## Feature Description

**Goal:** [What user problem does this solve?]

**User Story:**
> As a [user type],
> I want to [action],
> So that [benefit].

**Value Proposition:**
[Why is this feature important? What's the impact if we don't build it?]

---

## Acceptance Criteria

Use Given/When/Then format:

- [ ] Given [context], when [user action], then [system response]
- [ ] Given [context], when [user action], then [system response]
- [ ] Given [error condition], when [user action], then [graceful failure]

---

## 📚 Required Documentation

**Pre-Work (read these first):**
- [ ] `docs/research/XX-relevant-research-YYYYMMDD.md`
- [ ] `docs/dev/architecture/adr-NNN-relevant-decision-YYYYMMDD.md` (if exists)

**Deliverables (create these):**
- [ ] `docs/dev/features/feature-[name]-YYYYMMDD.md` — Feature specification
- [ ] `docs/dev/architecture/adr-NNN-[decision]-YYYYMMDD.md` — ADR (if architectural)
- [ ] `docs/dev/guides/guide-[how-to-use-feature]-YYYYMMDD.md` — User guide
- [ ] Update `docs/reference/api-reference-YYYYMMDD.md` (if API changes)

---

## 🧪 Testing Considerations

**Happy Path:**
- [What should work perfectly?]

**Edge Cases:**
- [What boundary conditions exist?]
- [What happens with invalid input?]
- [What happens with missing data?]

**Error Scenarios:**
- [What external dependencies can fail?]
- [How should errors be handled?]

**Performance:**
- [Expected load?]
- [Response time requirements?]

**Security:**
- [Any authentication/authorization needed?]
- [Input validation requirements?]

---

## 📝 Testing Plan (TDD)

**CRITICAL:** Write these tests BEFORE writing implementation code

### Unit Tests

- [ ] Test [core logic]
- [ ] Test [validation logic]
- [ ] Test [error handling]
- [ ] Test [edge cases]

### Integration Tests

- [ ] Test [component integration]
- [ ] Test [external API integration]
- [ ] Test [database operations]

### E2E Tests

- [ ] Test [complete user workflow]
- [ ] Test [error recovery]

---

## Technical Design

### Architecture

**Components Involved:**
- `src/[component-a]/` — [Responsibility]
- `src/[component-b]/` — [Responsibility]

**Data Flow:**
```
[User Input] → [Validation] → [Processing] → [Storage] → [Response]
```

**Dependencies:**
- [Vendored repo X] — [Why we need it]
- [Vendored repo Y] — [Why we need it]

### API Changes (if applicable)

**New Endpoints:**
```
POST /api/[resource]
GET /api/[resource]/:id
```

**Request/Response Schemas:**
```typescript
// Define Zod schemas
```

### Database Changes (if applicable)

**New Tables/Collections:**
```sql
CREATE TABLE [name] (...)
```

**Migrations:**
- [ ] Migration script created
- [ ] Rollback script created

---

## Implementation Plan

### Phase 1: Foundation
- [ ] Define schemas (Zod)
- [ ] Write failing tests
- [ ] Implement core logic

### Phase 2: Integration
- [ ] Connect to external services
- [ ] Add error handling
- [ ] Implement retry logic

### Phase 3: Polish
- [ ] Add logging
- [ ] Performance optimization
- [ ] Documentation

---

## ✅ Verification Checklist

**Before moving to `done/`:**

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Feature specification written (`docs/dev/features/`)
- [ ] User guide written (`docs/dev/guides/`)
- [ ] ADR written (if architectural decision)
- [ ] Code committed to main branch
- [ ] CI passed (when CI is implemented)
- [ ] Manual testing completed
- [ ] Performance tested (if performance-critical)
- [ ] Security reviewed (if security-sensitive)
- [ ] Accessibility checked (if UI feature)
- [ ] Error messages are user-friendly
- [ ] Logging added (structured logs)
- [ ] No hardcoded secrets
- [ ] API documentation updated (if API changes)

---

## Related

**Related Tasks:**
- [Dependent tasks]
- [Follow-up tasks]

**Related Features:**
- [Features this integrates with]

**Related Docs:**
- [Architecture decisions]
- [Research reports]

---

## Open Questions

- [ ] [Question 1] — Assigned to: [Name]
- [ ] [Question 2] — Assigned to: [Name]

---

## Notes

[Implementation notes, discoveries, gotchas]

---

**Last Updated:** YYYY-MM-DD
