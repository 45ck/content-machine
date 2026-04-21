# Validation Plan

The goal is to test which hypotheses best predict reach using creator analytics.

## Target variables

Primary target:

```text
y = log(1 + NonFollowerReach_72h)
```

Secondary targets:

```text
log(1 + TotalReach_72h)
log(1 + NonFollowerReach_7d)
P(Breakout)
P(next_reach_band)
```

Reach bands:

```text
Band 0: < 500
Band 1: 500–2,000
Band 2: 2,000–10,000
Band 3: 10,000–50,000
Band 4: 50,000+
```

## Required data collection checkpoints

```text
15 minutes
1 hour
3 hours
12 hours
24 hours
72 hours
7 days
```

## Metrics to collect

```text
platform
post_time
topic
format
length_seconds
followers_at_post
impressions / shown_in_feed
views
engaged_views
viewed_vs_swiped_away
3s_hold
average_watch_time
average_percentage_viewed
completion_rate
rewatch_rate
likes
comments
shares / sends
saves / favorites
follows / subscribers
profile_visits
not_interested
hides
reports
dislikes
non_follower_reach
total_reach
```

## Experiment 1 — retention beats likes

Hypothesis:

```text
RetentionScore predicts 72h non-follower reach better than LikeRate.
```

Model A:

```text
log(1 + Reach_72h) ~ LikeRate
```

Model B:

```text
log(1 + Reach_72h) ~ RetentionScore
```

Expected:

```text
R²_B > R²_A
```

## Experiment 2 — Instagram sends/saves beat likes/comments

Hypothesis:

```text
SendRate + SaveRate predicts Instagram non-follower reach better than LikeRate + CommentRate.
```

Model:

```text
log(1 + NonFollowerReach_72h) ~ SendRate + SaveRate + LikeRate + CommentRate + RetentionScore
```

Expected:

```text
β_send + β_save > β_like + β_comment
```

## Experiment 3 — YouTube viewed-vs-swiped gate

Hypothesis:

```text
ViewedVsSwiped and APV interact multiplicatively.
```

Model:

```text
P(Breakout) = σ(β0 + β1 ViewedVsSwiped + β2 APV + β3 ViewedVsSwiped·APV)
```

Expected:

```text
β3 > 0
```

## Experiment 4 — duration-debiased watch beats raw watch seconds

Model A:

```text
Reach ~ AverageWatchSeconds
```

Model B:

```text
Reach ~ DurationDebiasedWatch
```

Expected:

```text
Model B has lower log loss and higher R².
```

## Experiment 5 — topic clarity improves routing

Hypothesis:

```text
Clear-topic videos break out more often than vague-topic videos after controlling for retention.
```

Model:

```text
P(Breakout) = σ(β0 + β1 Retention + β2 ShareSave + β3 TopicClarity)
```

Expected:

```text
β3 > 0
```

## Experiment 6 — negative feedback kills expansion probability

Model:

```text
P(next_band) = σ(β0 + β1 Retention + β2 ShareSave - β3 NegativeFeedback)
```

Expected:

```text
β3 > 0 as a penalty.
```

## Evaluation criteria

```text
R² on log(1 + reach)
AUC for breakout prediction
log loss
calibration curve
precision@top10%
month-by-month cross-validation
ablation performance loss
```

## Ablation tests

Remove one block at a time:

```text
remove retention
remove share/save
remove negative feedback
remove topic clarity
remove duration debiasing
remove nonlinear interactions
remove platform-specific terms
```

A hypothesis becomes stronger if removing it worsens out-of-sample prediction.
