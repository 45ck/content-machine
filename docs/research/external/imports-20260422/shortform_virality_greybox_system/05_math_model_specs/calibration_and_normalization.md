# Calibration and Normalization

## Metric lift

```text
MetricLift_m =
log(
  (actual_rate_m + ε)
  /
  (expected_rate_m[platform, niche, duration, format, creator] + ε)
)
```

## Compressed lift

```text
CompressedLift_m = tanh(MetricLift_m)
```

## Probability calibration

Use one or more:

```text
Platt scaling
isotonic regression
temperature scaling
Bayesian calibration
```

## Calibration metrics

```text
Brier score
Expected Calibration Error
calibration curve
log loss
reliability diagram
```

## Ranking metrics

```text
PR-AUC
ROC-AUC
nDCG@10
Lift@10
pairwise accuracy
Spearman correlation
```

## Recommended labels

```text
top_decile_views_per_follower_72h
top_decile_non_follower_reach_72h
top_decile_shares_per_reach_72h
top_decile_saves_per_reach_72h
top_decile_APV_by_duration
top_decile_ECR_by_duration
```

## Avoid leakage

Pre-publish models may not use:

```text
views
likes
comments
shares
saves
post-publish retention
post-publish velocity
post-publish cohort labels
```
