# Temporal Holdout Plan

## Why temporal validation

Short-form platforms are non-stationary:

```text
trends change
audience behavior changes
platform metric definitions change
creator momentum changes
competition changes
```

Random splits can leak these effects.

## Example split

```text
train: Jan–Aug
validation: Sep–Oct
test: Nov–Dec
```

## Rolling backtest

```text
train Jan-Mar -> test Apr
train Jan-Apr -> test May
train Jan-May -> test Jun
...
```

## Metrics per split

```text
PR-AUC
nDCG@10
Lift@10
calibration error
top-score false positives
top-score false negatives
```

## Drift tracking

Track:

```text
feature drift
label drift
score distribution drift
platform-specific drift
creator-specific drift
trend-regime drift
```
