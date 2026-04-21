# Experiment Decision Rules

## Experiment object

Every experiment must have:

- hypothesis ID,
- buyer state,
- channel,
- audience,
- offer,
- claim IDs,
- primary metric,
- guardrail metrics,
- minimum runtime,
- budget cap,
- decision rule,
- kill rule,
- learning memo.

## Test types

### A/B test

Use when:

- you need clean comparison,
- one major variable changes,
- sample size is sufficient,
- learning accuracy matters.

### Multi-armed bandit

Use when:

- there are many creative variants,
- traffic is limited,
- you want to reduce spend on poor arms while exploring,
- the cost of serving weak variants is high.

Do not use bandits when:

- you need clean causal estimates,
- outcomes are delayed,
- conversion data is sparse,
- variants interfere with each other.

### Sequential test

Use when:

- you need monitored tests,
- spend risk matters,
- you can control false-positive risk.

### Holdout/incrementality test

Use when:

- deciding whether a channel/campaign causes business impact,
- retargeting may be over-credited,
- branded search may be harvesting existing demand.

## Kill rules

A variant can be paused if any of these are true after minimum exposure:

- policy rejection,
- landing page mismatch,
- spend reaches cap with zero meaningful downstream events,
- CTR is below threshold and quality comments indicate confusion,
- conversion cost exceeds cap by defined margin,
- negative feedback/comments indicate trust damage,
- activation quality is materially worse than baseline.

## Scale rules

Scale only if:

- primary metric beats baseline,
- guardrails are not violated,
- claim risk remains controlled,
- landing page can handle traffic,
- downstream quality is acceptable,
- no evidence of novelty-only spike.

## Learning memo template

```markdown
# Learning Memo

Experiment: EXP-001
Hypothesis: Buyers who fear AI inaccuracy respond better to “AI drafts; humans approve.”
Result: [won/lost/inconclusive]
Primary metric:
Guardrails:
Decision:
What we learned:
What not to conclude:
Next experiment:
```

## Mindset

The purpose of experiments is not to prove the agent was right. The purpose is to destroy weak hypotheses cheaply.
