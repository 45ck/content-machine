# Claude Opus 4.7 API Migration and Usage Notes

This file is for developers using Claude Opus 4.7 through API/platform tooling, not only through Claude Code UI.

## What changed that matters

### 1. Model ID

Use:

```text
claude-opus-4-7
```

Do not assume older aliases point to the newest behavior. Pin model IDs in production and upgrade intentionally.

### 2. Context and output

Opus 4.7 supports:

- 1M token context window;
- 128k max output tokens;
- text and image input;
- high-resolution image support;
- adaptive thinking;
- task budgets beta.

Business meaning: you can give the model much more context, but you must still manage relevance. A larger context window makes bad context management more expensive, not less important.

### 3. High-resolution image support

Opus 4.7 supports higher image resolution than previous Claude models. Use for:

- UI screenshots;
- chart/figure analysis;
- document layouts;
- slide reviews;
- visual regression checks;
- product demo screenshots;
- ad/landing-page screenshot critique.

Do not use high-resolution images when unnecessary. More pixels cost more tokens.

### 4. Adaptive thinking

Adaptive thinking is the thinking mode for Opus 4.7. Use it for:

- hard coding;
- multi-step agentic work;
- high-stakes analysis;
- architecture decisions;
- complicated buyer-facing agents;
- evidence-heavy research.

Do not use it reflexively for low-risk extraction, routing, tagging, short rewrites, or bulk ad variants.

### 5. Effort levels

The `xhigh` effort level is designed for difficult coding and agentic use cases. Use high/xhigh when failure is more expensive than tokens.

Operating rule:

- low/normal: cheap drafts, simple extraction, quick summaries;
- high: serious analysis, normal hard coding;
- xhigh: complex architecture, long-horizon agentic workflows, difficult debugging, high-value product demos.

### 6. Task budgets

Task budgets give the model a rough token budget for a full agentic loop. Use them when you want the model to prioritize and finish gracefully instead of wandering.

Good for:

- codebase review;
- refactor planning;
- long research tasks;
- complex PR reviews;
- multi-file implementation;
- buyer-insight synthesis.

Bad for:

- trivial commands;
- one-line edits;
- tasks with no clear stop condition.

### 7. Extended thinking budgets removed

Older `thinking: {budget_tokens: N}` patterns do not transfer directly. For Opus 4.7, use adaptive thinking and effort/output configuration instead.

Migration mindset: stop treating thinking as a fixed hidden-token allowance; start treating it as a task-budget and effort-control problem.

### 8. Sampling parameters removed

Opus 4.7 rejects non-default `temperature`, `top_p`, and `top_k` values. Guide behavior with:

- clearer instructions;
- examples;
- schemas;
- verification steps;
- allowed/forbidden output rules;
- post-generation checks.

This is important for marketing workflows. You cannot depend on temperature settings to create “creative mode” versus “strict mode.” Use prompt structure and review criteria.

### 9. Thinking content omitted by default

Do not design production systems that require access to raw hidden reasoning. Ask for structured summaries, decision logs, assumptions, and verification evidence instead.

Good output request:

```text
Return: final answer, assumptions, evidence checked, tests run, unresolved risks, next verification step.
```

Bad output request:

```text
Show your full chain of thought.
```

### 10. Tokenizer differences

Opus 4.7 uses a new tokenizer and may count text differently from earlier models. This can change cost and context-fit assumptions.

Migration rule:

- re-run token counting;
- increase `max_tokens` headroom;
- monitor cost after upgrade;
- do not compare cost/run across model versions without normalizing.

## Practical upgrade checklist

- [ ] Pin `claude-opus-4-7` explicitly in test environment.
- [ ] Run existing prompt/eval suite before production upgrade.
- [ ] Remove non-default temperature/top_p/top_k settings.
- [ ] Replace fixed thinking budgets with adaptive thinking/effort.
- [ ] Recalculate token counts for representative prompts.
- [ ] Compare quality, latency, cost, and human interventions.
- [ ] Check image-heavy workflows for cost increase.
- [ ] Update eval logs with model version and config.
- [ ] Update agent policy for higher autonomy.
- [ ] Keep rollback path to previous production model if available.

## Business interpretation

The API changes push you toward a more operational style:

- less knob-twiddling;
- more task framing;
- more verification;
- more budget control;
- more eval discipline.

This is correct. For software businesses, the valuable skill is not “finding magic parameters.” It is designing a system where the model has context, tools, constraints, and proof obligations.
