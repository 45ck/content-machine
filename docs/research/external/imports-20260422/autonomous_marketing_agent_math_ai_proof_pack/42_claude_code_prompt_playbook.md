# Claude Code Prompt Playbook

These prompts are designed for software/product builders studying buying behavior, ads, SaaS, and agentic development.

## Principle

Good prompts do not ask the agent to be impressive. They ask it to move through a verified workflow.

## Exploration prompts

### Codebase map

```text
Read the repo structure and identify the main product flows, backend services, frontend entry points, test framework, build commands, and deployment assumptions. Do not edit files. Return a map with files/directories I should know before making changes.
```

### Buyer-flow code map

```text
Find where the product handles signup, onboarding, pricing, checkout, activation, email capture, analytics events, and cancellation. Do not edit. Create a table: flow, files, current behavior, missing instrumentation, likely friction.
```

### Product proof audit

```text
Inspect the app and codebase for features that support the marketing claim: "[claim]". Identify what is already true, what is only partially true, what is not supported, and what demo or evidence would prove it.
```

## Planning prompts

### Feature plan

```text
I want to implement [feature] for [user/job]. Acceptance criteria:
- [criteria 1]
- [criteria 2]
- [criteria 3]

Use plan mode. Identify affected files, data model changes, tests, analytics events, edge cases, and rollback strategy. Do not implement until I approve the plan.
```

### A/B test infrastructure plan

```text
Plan a minimal A/B testing setup for [page/flow]. Requirements: deterministic assignment, event tracking, no external dependency unless already used, simple dashboard/export. Identify implementation files, test cases, and risks.
```

### Trial-to-paid activation plan

```text
Inspect the onboarding and trial flow. Propose three product changes likely to increase activation without dark patterns. For each: hypothesis, implementation scope, data needed, success metric, failure metric, and ethical risk.
```

## Implementation prompts

### Bug fix with failing test

```text
Users report: [bug]. Expected: [expected]. Actual: [actual].
First reproduce or write a failing test. Then fix the root cause. Run targeted tests and typecheck. Summarize changed files, why the fix works, and any residual risk.
```

### Landing page from real product behavior

```text
Build/update the landing page for [product] using only claims supported by current product behavior. Add sections for problem, specific transformation, proof/demo, limitations, pricing, FAQ, and low-risk CTA. Mark any unsupported claim as TODO instead of inventing proof.
```

### Demo generator

```text
Create a small demo path that shows [before state] becoming [after state]. Use realistic sample data. Add reset controls. Add instrumentation for demo_started, demo_completed, and cta_clicked. Include basic tests.
```

## Verification prompts

### PR quality gate

```text
Review the diff as if you are the maintainer. Check correctness, edge cases, test coverage, performance, security, accessibility, and whether the implementation matches the original acceptance criteria. Do not modify files yet. Return blocking issues, non-blocking issues, and suggested tests.
```

### Marketing-claim verification

```text
Audit this page for claims. For each claim, classify it as: directly proven by product, indirectly supported, unproven, exaggerated, or risky. Suggest a safer wording and the evidence required to make the stronger claim true.
```

### Benchmark-your-agent prompt

```text
Run this task as an evaluation. Keep a log of steps, files inspected, commands run, tests attempted, errors encountered, and interventions requested. At the end, score the run on: success, human interventions, time, token cost if available, tests passed, code-review risk, and confidence.
```

## Rescue prompts

### When Claude drifts

```text
Stop. Summarize what you have changed, what you believe the objective is, and what evidence supports that. Compare against the original acceptance criteria. Do not make more changes until you identify the mismatch.
```

### When Claude over-engineers

```text
Simplify the current implementation. Preserve behavior. Remove abstractions that are not needed for the current acceptance criteria. Keep only what is required to pass tests and support the product workflow.
```

### When Claude loops

```text
You have tried multiple fixes without convergence. Create a failure analysis: attempted fixes, why each failed, common assumptions, missing information, and the next smallest diagnostic step. Do not implement yet.
```

## The prompt mindset

- Do not command every keystroke.
- Define outcome, constraints, evidence, and risk.
- Force inspect-before-edit on unclear work.
- Use tests and screenshots as truth.
- Use clear stop conditions.
