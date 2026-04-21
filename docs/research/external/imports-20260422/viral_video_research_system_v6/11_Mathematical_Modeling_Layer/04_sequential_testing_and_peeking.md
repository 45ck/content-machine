# Sequential testing and peeking control

## Problem

Creators constantly check performance early. This creates false confidence if results are interpreted as final too soon.

## Rule

Do not make final decisions at arbitrary peeks unless using a sequential rule.

## Checkpoints

Use fixed checkpoints:

```text
T1 = 1 hour / early exposure read
T2 = 24 hours / first distribution read
T3 = 72 hours / stabilisation read
T4 = 7 days / short-tail read
T5 = 30 days / search/long-tail read
```

## Sequential decision bands

At each checkpoint:

```text
Green band: very high probability of improvement and guardrails pass.
Yellow band: signal exists but not enough evidence.
Red band: strong evidence of failure or guardrail breach.
```

Example:

```text
Green: P(U_v > baseline + δ) ≥ 0.90
Yellow: 0.55–0.90
Red: < 0.55 or guardrail failure
```

## Early read policy

```text
1 hour:
Only diagnose catastrophic first-frame/hook failure.
Do not declare winner.

24 hours:
Decide rewrite/replicate candidates.
Do not scale unless exposure is high and effect is clear.

72 hours:
Primary batch decision.

7 days:
Mechanism decision.

30 days:
Search/long-tail decision.
```

## Always-valid logic

If continuous monitoring is required, use always-valid p-values/confidence sequences or Bayesian posterior thresholds with conservative decision bands.

## Creator-safe shortcut

If full sequential methods are too heavy:

```text
Never scale at T1.
Only rewrite at T1.
Only replicate at T2.
Only scale at T3 or later unless controlled exposure and strong evidence exist.
```
