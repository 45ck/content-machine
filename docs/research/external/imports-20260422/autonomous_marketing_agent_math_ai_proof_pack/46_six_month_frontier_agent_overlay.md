# Six-Month Frontier Agent Overlay

This overlay sits on top of the original 24-week curriculum. It focuses on Claude Code, Opus-class models, coding-agent benchmarks, and business/product leverage.

## Month 1 — Foundations: agents, benchmarks, skepticism

### Week 1: Claude Code mental model

Read:
- Claude Code overview.
- How Claude Code works.
- Best practices.

Practice:
- Install/use a terminal agent on a small repo.
- Create a minimal CLAUDE.md.
- Run one exploration-only session.

Deliverable:
- `CLAUDE.md` v1 and a one-page operating policy.

### Week 2: Benchmark map

Read:
- SWE-bench overview.
- Aider Polyglot.
- Terminal-Bench.
- Opus 4.7 system card summary.

Practice:
- Fill out benchmark cards: what each tests and what it does not test.

Deliverable:
- Personal benchmark interpretation sheet.

### Week 3: Benchmark criticism

Read:
- UTBoost paper.
- Data contamination survey.
- LLM benchmark survey.

Practice:
- Take five leaderboard claims and write why each could mislead.

Deliverable:
- Benchmark bullshit detector checklist.

### Week 4: First private eval

Practice:
- Create 10 tasks from a real or toy repo.
- Run two agents/models on 3 tasks.
- Track pass/fail, time, intervention count, review issues.

Deliverable:
- Private eval v0.

## Month 2 — Claude Code operations

### Week 5: Plan mode and task decomposition

Practice:
- For 5 tasks, force explore → plan → implement → verify.
- Compare against direct implementation.

Deliverable:
- When-to-plan policy.

### Week 6: Verification engineering

Practice:
- Add missing tests around one flow.
- Add lint/typecheck/test commands to CLAUDE.md.
- Create one hook or script that forces a check.

Deliverable:
- Verification checklist.

### Week 7: Subagents, skills, hooks, MCP

Practice:
- Create one skill for bug fixes.
- Create one subagent for code review or research.
- Connect one external tool if safe.

Deliverable:
- `.claude/skills/` prototype.

### Week 8: Cost and token discipline

Practice:
- Run same task with cheap/default/frontier model.
- Track output quality vs cost and interventions.

Deliverable:
- Model selection policy v1.

## Month 3 — Product and SaaS workflows

### Week 9: Instrumentation and analytics

Practice:
- Ask agent to map signup/onboarding/checkout events.
- Implement one analytics event plan.

Deliverable:
- Activation-event schema.

### Week 10: Prototype-before-copy

Practice:
- Build a tiny demo for one product promise.
- Write landing copy only from proven demo behavior.

Deliverable:
- Demo + claim ledger.

### Week 11: Objection-handling assets

Practice:
- Build pricing FAQ, comparison table, integration page, or security FAQ.
- Mark unsupported claims.

Deliverable:
- Proof asset pack.

### Week 12: Trial activation flow

Practice:
- Build an onboarding checklist/sample project/demo mode.
- Instrument the first-win event.

Deliverable:
- Activation experiment.

## Month 4 — AI-search, buyer agents, and proof surfaces

### Week 13: Answer-engine visibility

Practice:
- Audit docs for machine-readable facts: pricing, features, integrations, limitations.

Deliverable:
- AI-search proof surface checklist.

### Week 14: Buyer-facing concierge

Practice:
- Build a constrained FAQ assistant using only docs/pricing/security pages.
- Add refusal rules and escalation.

Deliverable:
- Buyer assistant policy.

### Week 15: Review and support mining

Practice:
- Build a pipeline that clusters reviews/support tickets into jobs, objections, and proof needs.

Deliverable:
- Buyer-insight dashboard.

### Week 16: Competitive intelligence

Practice:
- Build competitor matrix from public docs/reviews with source links.
- Mark uncertain claims.

Deliverable:
- Competitor proof map.

## Month 5 — Advanced eval and production discipline

### Week 17: Expand private eval to 30 tasks

Practice:
- Add task categories: bug, feature, refactor, UI, analytics, docs.

Deliverable:
- Eval set v1.

### Week 18: Blind review

Practice:
- Hide agent/model identity during review.
- Score quality and risk.

Deliverable:
- Review rubric.

### Week 19: Agent safety gates

Practice:
- Write `AGENT_POLICY.md`.
- Add forbidden commands and approval gates.

Deliverable:
- Agent governance file.

### Week 20: Agentic PR workflow

Practice:
- Use gh CLI to create issue → branch → implementation → PR → review summary.

Deliverable:
- Repeatable agentic PR workflow.

## Month 6 — Capstone

### Week 21: Build product growth system

Build:
- buyer-insight pipeline;
- landing/demo page;
- activation instrumentation;
- evidence/claim ledger;
- one AI-search-friendly proof page.

### Week 22: Run model/agent eval

Run:
- 30 tasks across at least 2 agents/models;
- analyze by task family.

### Week 23: Ship campaign + product experiment

Ship:
- small campaign;
- product change;
- measurement plan.

### Week 24: Write operator memo

Final memo:
- what buyers believe;
- what proof they need;
- what AI changed;
- where agents saved time;
- where agents failed;
- model-selection policy;
- next 90-day roadmap.

## End-state mindset

You are not learning AI tools to become a prompt collector.

You are building a system for faster verified learning, faster product proof, and more precise buyer trust.
