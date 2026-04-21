# Model calibration protocol

## Why calibration matters

If the AI says “80% chance this beats baseline,” that prediction must be checked against reality.

## Calibration table

Bucket predictions by confidence:

```text
Predicted 50–60% → actual win rate should be near 55%
Predicted 60–70% → actual win rate should be near 65%
Predicted 70–80% → actual win rate should be near 75%
Predicted 80–90% → actual win rate should be near 85%
```

## Monthly calibration review

For each model/critic:

```text
Brier score for binary predictions
mean absolute error for continuous forecasts
coverage rate for prediction intervals
false scale rate
false kill rate
```

## Failure modes

```text
overconfident model
underconfident model
platform drift
niche drift
feature leakage
low sample size
selection bias from only analysing posted assets
```

## Fixes

```text
recalibrate using latest 30–100 posts
separate models by platform and content form
include exposure source as a covariate
use wider intervals for new formats
keep human-in-loop guardrails
```
