# Build Your Own Coding-Agent Eval

Public benchmarks help you choose candidates. Your private eval decides what to deploy.

## Objective

Build a small, repeatable benchmark using tasks that represent your actual work.

## Step 1 — Choose task families

Create 5–10 tasks in each family:

1. Bug fix with known reproduction.
2. Small feature with acceptance criteria.
3. Refactor with behavior preservation.
4. UI change requiring screenshot/visual verification.
5. Analytics/instrumentation change.
6. API integration or external-service workflow.
7. Documentation/security/pricing page update.
8. Product/marketing demo prototype.
9. Data extraction/reporting script.
10. Test-writing task.

Start with 30 tasks total. Expand to 100 when the process is stable.

## Step 2 — Write task cards

Each task card should include:

- task ID;
- business context;
- repo/branch;
- starting commit;
- allowed tools;
- forbidden actions;
- acceptance criteria;
- verification commands;
- expected files touched if known;
- time/cost budget;
- human-review rubric.

## Step 3 — Define metrics

### Capability metrics

- pass/fail;
- partial success;
- tests passing;
- hidden tests passing;
- code-review blocking issues;
- rollback needed;
- security/privacy issue introduced.

### Workflow metrics

- wall-clock time;
- human interventions;
- number of prompts;
- commands run;
- files changed;
- review time;
- cost/tokens;
- retries.

### Business metrics

- time to prototype;
- time to validated demo;
- activation metric implemented;
- support burden reduced;
- experiment shipped;
- buyer proof asset produced.

## Step 4 — Compare agent stacks

Do not compare only models. Compare stacks:

- Claude Code + Opus 4.7;
- Claude Code + Sonnet/default;
- Cursor agent + model X;
- Codex CLI / other CLI agent;
- human baseline;
- hybrid: cheap model first, Opus only on failure.

## Step 5 — Use fixed prompting conditions

For fairness:

- same task card;
- same branch;
- same context allowed;
- same tool permissions;
- same time budget;
- same test commands;
- same review rubric.

## Step 6 — Review blindly where possible

When reviewing code quality, hide which agent/model produced the diff. Otherwise brand expectation contaminates judgment.

## Step 7 — Analyze by task family

Do not average everything into one fake truth.

Example:

| Task family | Cheap model | Sonnet | Opus 4.7 | Human | Decision |
|---|---:|---:|---:|---:|---|
| Small bug fixes | 70% | 88% | 90% | 95% | Sonnet default |
| Multi-file refactors | 25% | 55% | 78% | 90% | Opus for refactors |
| Landing demos | 45% | 70% | 85% | 88% | Opus for first build, Sonnet for iterations |
| Review mining | 92% | 95% | 96% | 98% | Cheap model enough |

## Step 8 — Convert eval into operating policy

Example policy:

- Use cheap model for extraction/routing.
- Use Sonnet for normal tickets under 2 files.
- Use Opus 4.7 for architecture, refactors, multi-file features, visual/product demos.
- Use human-only for production secrets, payments, auth migrations, security-critical flows unless agent is sandboxed and reviewed.
- Require tests for every agent-created code change.
- Require claim ledger for every agent-created marketing page.

## Sample task card template

```markdown
# Eval Task: [ID] [Title]

## Business context
[Why this matters]

## Starting state
Repo:
Branch/commit:
Setup commands:

## Task
[Plain-English task]

## Acceptance criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Verification
Commands:
Expected output:
Manual check:

## Allowed tools
[files, bash, gh, browser, docs, etc.]

## Forbidden actions
[deploy, destructive DB writes, credential changes]

## Budget
Time:
Token/cost:
Retries:

## Review rubric
Correctness:
Maintainability:
Security/privacy:
Test coverage:
Business fit:
```

## The mindset

Your eval is not there to crown a champion. It is there to create an operating policy that tells you **which work to delegate, to which agent, under which safety gates**.
