# Prompt library

## Hook generator

```text
Generate 10 hooks for [topic].
Each hook must use a different mechanism:
problem-first, result-first, proof-first, contrarian, identity, experiment, cost-of-inaction, relief, surprise, search-direct.
Return hook, mechanism, expected metric, and risk.
```

## First-frame generator

```text
Design 5 first-frame variants for [topic].
Use: face, before/after, result-first, visible problem, proof screenshot.
For each, specify on-screen text, subject placement, and primary metric.
```

## Cognitive load audit

```text
Audit this script/storyboard for cognitive load.
Flag: excessive text, competing audio, unclear visual focus, late payoff, unreadable captions, unnecessary cuts.
Return fixes.
```

## CTA matcher

```text
Given this video, choose the best CTA among save, send, comment, follow, search/no CTA.
Explain the viewer motivation and expected metric.
```

## Postmortem agent

```text
Given metrics at 24h/72h/7d, classify the failed gate.
Return: diagnosis, likely cause, next rewrite, kill/replicate/scale decision.
```
