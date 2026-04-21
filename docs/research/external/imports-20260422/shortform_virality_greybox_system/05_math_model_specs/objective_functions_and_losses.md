# Objective Functions and Losses

## Binary classification

For top-decile breakout:

```text
y = 1 if normalized metric is in top decile
```

Loss:

```text
binary cross entropy
focal loss if positives are rare
```

## Ranking

For draft selection:

```text
pairwise logistic loss
LambdaMART
nDCG optimization
```

## Multi-task intent

```text
L =
λ_like L_like
+ λ_comment L_comment
+ λ_share L_share
+ λ_save L_save
+ λ_follow L_follow
```

## Survival

```text
discrete-time survival BCE
Cox partial likelihood
```

## Regression

For log reach:

```text
y = log(1 + non_follower_reach_72h)
```

Loss:

```text
Huber
MAE
quantile loss
```

## Calibration

After training:

```text
calibrate with isotonic or Platt scaling
evaluate Brier score and ECE
```

## Recommended final objective

Use both:

```text
classification: P(top decile)
ranking: nDCG@10 for draft selection
calibration: Brier/ECE for probability reliability
```
