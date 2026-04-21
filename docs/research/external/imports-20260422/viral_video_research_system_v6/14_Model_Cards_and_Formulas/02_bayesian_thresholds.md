# Bayesian thresholds

## Default thresholds

```text
Scale: P(improvement > δ) ≥ 0.85
Replicate: 0.65–0.85
Rewrite: promising early gate but weak downstream gate
Kill: <0.35 or 3 failures
```

## Conservative thresholds

Use when risk is high:

```text
Scale: ≥ 0.95
Replicate: 0.75–0.95
Kill: <0.25
```

## Aggressive exploration thresholds

Use for low-risk creative exploration:

```text
Scale candidate: ≥ 0.75
Replicate: 0.55–0.75
Kill: <0.30
```

## Minimum practical effects

Examples:

```text
CTV: +5 percentage points or +15% relative lift
APV: +10% relative lift
SAV: +20% relative lift
SND: +20% relative lift
FOL: +15% relative lift
```

Set thresholds per platform and niche after baseline data exists.
