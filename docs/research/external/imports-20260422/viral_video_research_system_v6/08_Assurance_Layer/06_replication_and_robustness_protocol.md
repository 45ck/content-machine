# Replication and Robustness Protocol

A single winning post is not enough.

## Replication Trio

A mechanism becomes a candidate format only after:

```text
3 videos using the same mechanism
same primary metric improves versus rolling baseline
no trust/negative-feedback guardrail failure
```

Example:

```text
Mechanism: before/after first frame
Metric: chose-to-view
Runs: 3 videos in same niche, different topics
Decision: scale only if 2/3 beat baseline and the third is not a severe failure
```

## Robustness tiers

### R0 — Anecdote

One video did well. Do not scale heavily.

### R1 — Same-topic replication

Same mechanism works on the same topic.

### R2 — Same-niche replication

Same mechanism works across different topics in the same niche.

### R3 — Surface replication

Same mechanism works on another platform/surface after native adaptation.

### R4 — Time replication

Same mechanism works in a later week, not just one trend window.

### R5 — Audience replication

Same mechanism works for followers and non-followers, or for two cold-audience tests.

## Robustness kill rules

Kill or rewrite if:

```text
3 consecutive failures below baseline
2 trust failures
high start rate but repeated poor completion
high comments but repeated poor follows/saves
organic success cannot be replicated with controlled exposure
```
