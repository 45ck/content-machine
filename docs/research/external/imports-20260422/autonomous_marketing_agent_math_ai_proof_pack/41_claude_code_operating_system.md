# Claude Code Operating System

This is the practical operating model for using Claude Code or similar terminal agents to build software businesses faster without becoming sloppy.

## Core mental model

Claude Code is not “autocomplete.” It is a terminal-based agent loop:

**gather context → act through tools → verify → repeat.**

Your job is not to write perfect prompts. Your job is to design the operating environment so the agent can discover context, make changes safely, and verify work.

## The five control surfaces

### 1. Project memory: CLAUDE.md

Use for stable project rules:

- build/test/lint commands;
- architecture rules;
- branch and PR conventions;
- naming conventions;
- forbidden patterns;
- environment setup gotchas;
- verification requirements.

Keep it short. Bloated instructions get ignored or diluted.

### 2. Verification: tests, linters, screenshots, scripts

Claude performs better when it can check its own work.

Good verification instructions:

- “Write a failing test first.”
- “Run `npm test -- auth`.”
- “Run typecheck and lint before final response.”
- “Take a screenshot of the result and compare it to the reference.”
- “Do not mark complete unless the migration passes locally.”

### 3. Permissions and sandboxing

Use more autonomy only when risk is bounded.

- Read-only / plan mode: unfamiliar code, risky changes, architecture decisions.
- Auto-accept edits: routine local edits with tests.
- Permission allowlists: safe repeated commands like test/lint/status.
- Sandbox: isolate file/network access.
- Never allow silent deploys, database writes, credential changes, or destructive commands without explicit human approval.

### 4. Tools and integrations

High-leverage tools:

- `gh` for GitHub issues/PRs/comments.
- package manager and test runner.
- Sentry/Datadog/CloudWatch CLI for debugging.
- Playwright/Cypress for browser verification.
- MCP servers for Figma, Notion, database, analytics, issue trackers.
- Local scripts that expose business-specific verification.

The more verifiable tools Claude has, the less it has to guess.

### 5. Context architecture

Use context deliberately:

- Use plan mode for exploration.
- Reference specific files instead of describing them from memory.
- Use subagents for isolated broad searches or reviews.
- Use skills for repeatable workflows.
- Use hooks for deterministic enforcement.
- Clear/restart when the session drifts.

## Standard workflows

### Workflow A: Unknown codebase exploration

1. Plan mode.
2. Ask Claude to map the repo.
3. Ask for architecture summary and risky areas.
4. Ask for likely entry points for the task.
5. Only then implement.

Mindset: **recon before movement.**

### Workflow B: Bug fix

1. Provide symptom and expected behavior.
2. Ask Claude to reproduce or write failing test.
3. Fix root cause.
4. Run targeted tests.
5. Run broader regression tests.
6. Summarize changed files and remaining risks.

Mindset: **test proves understanding.**

### Workflow C: Feature implementation

1. Define user story and acceptance criteria.
2. Ask for plan and files likely to change.
3. Review plan.
4. Implement in small commits.
5. Add tests and analytics events.
6. Generate PR description with risk notes.

Mindset: **ship a verified increment, not a blob of code.**

### Workflow D: Marketing/product prototype

1. Give buyer job and promise.
2. Ask Claude to build the smallest working demo proving the promise.
3. Instrument activation events.
4. Add error states and empty states.
5. Write landing-page copy from the demo’s real behavior.
6. Create proof assets: GIF, screenshots, before/after examples.

Mindset: **claim follows demo; demo follows buyer job.**

### Workflow E: Refactor

1. Ask Claude to identify seams and dependency graph.
2. Create plan with rollback strategy.
3. Add characterization tests.
4. Refactor one boundary at a time.
5. Run tests after each phase.
6. Document behavior preserved and behavior changed.

Mindset: **behavior preservation before elegance.**

### Workflow F: Buyer-facing AI feature

1. Define allowed claims and forbidden claims.
2. Build retrieval from product docs, pricing, security, support FAQs.
3. Create refusal/fallback rules.
4. Add logging and eval prompts.
5. Test with adversarial buyer questions.
6. Monitor hallucination and escalation rate.

Mindset: **assistant as evidence router, not persuasive liar.**
