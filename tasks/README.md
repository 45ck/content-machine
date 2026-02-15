# Task Management

**Location:** `tasks/`

**Date Convention:** All tasks MUST include `YYYYMMDD` suffix in filename.

---

## Directory Structure

```
tasks/
├── todo/               # Ready to start (prioritized)
├── in_progress/        # Currently being worked on (max 3 per person)
├── done/               # Completed (archive after 30 days)
├── blocked/            # Waiting on external dependency
└── templates/          # Task templates (MANDATORY to use)
```

---

## Task Naming Convention

**Format:** `TASK-NNN-type-short-description-YYYYMMDD.md`

**Examples:**

- `TASK-001-feature-mcp-reddit-connector-20260102.md`
- `TASK-002-bug-whisper-timestamp-drift-20260115.md`
- `TASK-003-research-remotion-composition-patterns-20260110.md`
- `TASK-004-refactor-video-pipeline-20260120.md`

**Task Types:**

- `feature` – New functionality
- `bug` – Bug fix
- `research` – Investigation/spike
- `refactor` – Code improvement (no behavior change)
- `docs` – Documentation only
- `test` – Testing improvements

---

## Workflow

### 1. Creating a Task

1. **Copy template** from `tasks/templates/`:
   - `TASK.template.md` — General purpose
   - `TASK-BUG.template.md` — Bug fixes (TDD-first)
   - `TASK-FEATURE.template.md` — New features
   - `TASK-RESEARCH.template.md` — Investigations

2. **Name with date:** `TASK-NNN-type-description-YYYYMMDD.md`

3. **Fill MANDATORY sections:**
   - 📚 Required Documentation
   - 🧪 Testing Considerations
   - 📝 Testing Plan
   - ✅ Verification Checklist

4. **Place in `todo/`**

### 2. Starting Work

1. Move task from `todo/` to `in_progress/`
2. **Max 3 concurrent tasks per person**
3. Read relevant docs and research reports
4. Review architecture decisions (ADRs)

### 3. Implementation (TDD)

```
🔴 RED     → Write failing test that defines expected behavior
🟢 GREEN   → Write minimal code to pass the test
🔵 REFACTOR → Improve code while keeping tests green
```

**Rules:**

- Tests MUST be written BEFORE implementation code
- Bug fixes MUST have a failing test that reproduces the bug
- Features MUST have tests for each acceptance criterion
- No task moves to `done/` without all tests passing

### 4. Completion

A task is **NOT complete** until:

- [ ] All acceptance criteria met
- [ ] 🧪 Testing Plan fully executed (all tests passing)
- [ ] 📚 All required documentation created and linked (with YYYYMMDD dates)
- [ ] Code committed to main branch
- [ ] CI passed (when implemented)
- [ ] ✅ Verification Checklist 100% checked

**Then:** Move task from `in_progress/` to `done/`

### 5. Archival

- Tasks in `done/` older than 30 days → archive to `done/archive-YYYYMM/`
- Keeps `done/` manageable
- Preserves history

---

## Mandatory Phases (Every Task)

| Phase                         | What to Do                                       | Output               |
| ----------------------------- | ------------------------------------------------ | -------------------- |
| **1. Documentation Planning** | Determine what docs this task requires           | List in task file    |
| **2. Testing Considerations** | Analyze what needs testing, edge cases, risks    | Section in task file |
| **3. Testing Plan**           | Define specific test cases BEFORE implementation | Section in task file |
| **4. Implementation**         | TDD: Write failing tests → Implement → Verify    | Code + Tests         |
| **5. Verification (V&V)**     | Complete checklist, CI/CD, production check      | All boxes checked    |

---

## Documentation Requirements by Task Type

| Task Type    | Pre-Work                   | Deliverable                                 | Post-Work                  |
| ------------ | -------------------------- | ------------------------------------------- | -------------------------- |
| **Bug**      | Investigation (if complex) | Bug Report (`docs/dev/bugs/`)               | Postmortem (if critical)   |
| **Feature**  | ADR (if architectural)     | Feature Spec (`docs/dev/features/`) + Tests | Guide (`docs/dev/guides/`) |
| **Research** | —                          | Investigation Doc (`docs/investigations/`)  | ADR, Follow-up Tasks       |
| **Refactor** | Investigation (if risky)   | ADR (`docs/dev/architecture/`)              | —                          |

**All docs MUST include YYYYMMDD suffix!**

---

## Templates

### Available Templates

| Template                    | Use For        | Location           |
| --------------------------- | -------------- | ------------------ |
| `TASK.template.md`          | General tasks  | `tasks/templates/` |
| `TASK-BUG.template.md`      | Bug fixes      | `tasks/templates/` |
| `TASK-FEATURE.template.md`  | New features   | `tasks/templates/` |
| `TASK-RESEARCH.template.md` | Investigations | `tasks/templates/` |

### Task File Sections

Every task file should have:

1. **Title & Metadata** – Task ID, type, priority, estimate
2. **Description** – What needs to be done and why
3. **Acceptance Criteria** – Definition of "done"
4. **Required Documentation** – What docs need to be created/updated
5. **Testing Considerations** – What needs testing, edge cases
6. **Testing Plan** – Specific test cases (write these BEFORE coding)
7. **Implementation Notes** – Technical details, gotchas
8. **Verification Checklist** – Pre-commit checklist
9. **Related** – Links to related tasks, docs, ADRs

---

## Priority Levels

| Priority | Meaning                    | SLA               |
| -------- | -------------------------- | ----------------- |
| **P0**   | Critical outage, data loss | Start immediately |
| **P1**   | Major feature broken       | Within 1 day      |
| **P2**   | Minor bug, enhancement     | Within 1 week     |
| **P3**   | Nice-to-have               | Backlog           |

---

## Estimating

**T-shirt sizes:**

- **XS:** < 2 hours
- **S:** 2-4 hours
- **M:** 4-8 hours (1 day)
- **L:** 8-16 hours (2 days)
- **XL:** 16+ hours (break down into smaller tasks)

**Rule:** If estimate > 2 days, decompose into smaller tasks.

---

## Blocking

If a task is blocked:

1. Move to `blocked/`
2. Add blocker info to task file:

   ```markdown
   ## Blocker

   **What's blocking:** Waiting for X API access
   **Who can unblock:** John Doe
   **Expected resolution:** 2026-01-10
   **Workaround:** None
   ```

3. Create follow-up reminder task for unblock date

---

## Tips

### Good Task Descriptions

❌ **Bad:** "Fix the bug"
✅ **Good:** "Fix timestamp drift in Whisper transcription when video > 5 minutes"

❌ **Bad:** "Add MCP server"
✅ **Good:** "Implement Reddit MCP server for trend research (trending posts, comments, vote data)"

### Good Acceptance Criteria

Use **Given/When/Then** format:

```markdown
- [ ] Given a video > 5 minutes, when transcribing with Whisper, then timestamps are accurate within 100ms
- [ ] Given Reddit trending post, when fetching via MCP, then returns post + top 10 comments
- [ ] Given invalid Reddit credentials, when connecting, then returns clear error message
```

### Testing First (TDD)

**Before writing implementation:**

1. Write the test that validates the fix/feature
2. Run the test (it should fail)
3. Implement the fix/feature
4. Run the test (it should pass)
5. Refactor if needed (test still passes)

**This ensures:**

- Tests actually test something
- No regression later
- Clear specification of expected behavior

---

## Examples

### Feature Task

**File:** `tasks/todo/TASK-001-feature-mcp-reddit-connector-20260102.md`

```markdown
# TASK-001: Implement Reddit MCP Server for Trend Research

**Type:** Feature
**Priority:** P1
**Estimate:** L (2 days)
**Created:** 2026-01-02
**Owner:** Unassigned

## Description

Implement MCP server that connects to Reddit API for trend research. Server should support fetching trending posts from specified subreddits and extracting top comments for analysis.

## Acceptance Criteria

- [ ] Given subreddit name, when fetching trending posts, then returns top 25 posts with metadata (title, score, comments, url)
- [ ] Given post ID, when fetching comments, then returns top 10 comments sorted by score
- [ ] Given invalid subreddit, when connecting, then returns clear error message
- [ ] Given API rate limit exceeded, when making request, then implements exponential backoff

## Required Documentation

- [ ] `docs/dev/guides/guide-setup-reddit-mcp-20260102.md` — Setup guide
- [ ] `docs/reference/api-reddit-mcp-20260102.md` — API reference
- [ ] Update `docs/dev/architecture/` if new patterns

## Testing Plan

### Unit Tests

- [ ] Test subreddit validation
- [ ] Test comment sorting logic
- [ ] Test rate limit handling
- [ ] Test error handling

### Integration Tests

- [ ] Test Reddit API connection (mocked)
- [ ] Test MCP protocol compliance
- [ ] Test timeout handling

### E2E Tests

- [ ] Test full workflow: fetch trending → extract comments → return structured data

## Verification Checklist

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] Code committed to main
- [ ] Documentation created with YYYYMMDD dates
- [ ] Task moved to `done/`
```

---

**Last Updated:** 2026-01-02
