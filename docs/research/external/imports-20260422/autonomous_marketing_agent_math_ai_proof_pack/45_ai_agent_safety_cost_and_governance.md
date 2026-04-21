# AI Agent Safety, Cost, and Governance

The more capable the agent, the more important the rails.

## Safety layers

### 1. Scope boundary

Define what the agent may touch:

- repo path;
- branch/worktree;
- files allowed;
- files forbidden;
- tools allowed;
- external systems allowed;
- network access;
- secrets access.

### 2. Human approval boundary

Require explicit approval for:

- deployments;
- production database writes;
- migrations;
- auth/payment changes;
- secrets handling;
- infrastructure changes;
- customer messaging;
- pricing/legal/security claims;
- destructive file operations.

### 3. Verification boundary

No “done” without evidence:

- tests run;
- typecheck/lint;
- screenshot if UI;
- security scan where relevant;
- diff summary;
- risk note;
- rollback plan.

### 4. Claim boundary

For marketing and sales artifacts:

- no invented customers;
- no fake reviews;
- no unsupported numbers;
- no hidden limitations;
- no dark-pattern pricing/cancellation flows;
- no false urgency or artificial scarcity;
- every strong claim must be traceable to proof.

### 5. Cost boundary

Track:

- tokens/cost per task;
- cost per accepted PR;
- cost per useful asset;
- cost per experiment shipped;
- human review time;
- failed-run burn;
- opportunity cost of context switching.

Expensive models are justified when they reduce human review burden or unlock tasks cheaper models fail.

## Opus-class cost discipline

Use Opus-like models for:

- ambiguous, high-value tasks;
- architecture decisions;
- complex bug hunts;
- multi-file refactors;
- long-context understanding;
- visual/document tasks;
- hard buyer-facing AI workflows.

Do not use Opus-like models for:

- bulk ad variants;
- simple rewriting;
- basic extraction;
- keyword clustering;
- low-risk summaries;
- simple CRUD boilerplate if cheaper models pass.

## Token-burn controls

- Narrow the task before starting.
- Use plan mode for exploration.
- Provide exact files and commands when known.
- Use subagents for isolated searches.
- Keep CLAUDE.md short.
- Use hooks/scripts instead of long instructions.
- Ask for one phase at a time.
- Stop and reset after repeated failed loops.
- Keep task budgets explicit.

## Governance artifacts to maintain

1. `CLAUDE.md` — project rules.
2. `AGENT_POLICY.md` — what agents may/may not do.
3. `CLAIM_LEDGER.csv` — marketing claims and evidence.
4. `EVAL_TASKS/` — private benchmark tasks.
5. `AGENT_RUN_LOG.csv` — outcomes, interventions, costs.
6. `SECURITY_REVIEW.md` — high-risk flow checklist.
7. `BUYER_ASSISTANT_POLICY.md` — allowed/forbidden buyer-facing claims.

## The mindset

Autonomy without verification is gambling.

The disciplined system gives the agent enough freedom to produce leverage, but not enough authority to silently create business, security, legal, or trust damage.
