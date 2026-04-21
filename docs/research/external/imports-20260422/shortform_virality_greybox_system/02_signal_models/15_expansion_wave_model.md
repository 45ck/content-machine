# Expansion-Wave Model

## Signal

```text
P_expand_k
```

## Question answered

```text
Will the platform expand the video to the next audience wave?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts 24h/72h reach | 35% |
| Uses early real metrics | 25% |
| Baseline normalization | 20% |
| Platform similarity | 10% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Bayesian wave model | Use Beta posteriors for stop, retention, share, save, follow, and negative rates. | 97 |
| 2 | Early-metric stacked model | Use observed first 15/30/60-minute metrics plus pre-publish score. | 93 |
| 3 | Velocity/acceleration model | Track views/min, shares/min, saves/min, acceleration, and decay. | 90 |
| 4 | Cohort-quality model | Score whether early viewers are non-followers, topic-fit viewers, sharers, or weak/random viewers. | 86 |
| 5 | Raw first-hour views model | Predict final reach from first-hour views only. | 45 |

## Recommended build

```text
Bayesian wave model
```

## Mathematical formulation

```text
q_m ~ Beta(α0, β0)

q_m | data =
Beta(α0 + positive_events,
     β0 + total_impressions - positive_events)

P_expand_k =
P(QualityScore > θ_k | observed_data)
```

## Required features

- shown in feed
- viewed vs swiped
- APV
- completion
- shares
- saves
- comments
- follows
- negative feedback
- velocity
- cohort quality

## Training targets

- 24h top-decile reach
- 72h top-decile reach
- next-wave expansion
- stall flag

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
At 30–60 minutes, P_expand should predict 24h/72h breakout better than raw views and raw likes.
```

## Failure modes

- Wrong priors
- Platform thresholds changing
- Early cohort not representative

## Keep / kill rule

Keep this signal only if removing it from the final stacked model causes measurable degradation in:

```text
PR-AUC
nDCG@10
Lift@10
pairwise selection accuracy
calibration error
temporal holdout performance
```
