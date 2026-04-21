# Creator Trust / Baseline Model

## Signal

```text
CreatorTrust
```

## Question answered

```text
What performance should we expect from this creator before seeing the new video?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Removes account-size bias | 30% |
| Predicts expected baseline | 25% |
| Data availability | 20% |
| Platform portability | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Hierarchical Bayesian baseline | Use global -> platform -> niche -> creator -> format -> duration priors. | 96 |
| 2 | Rolling EWMA baseline | Use exponentially weighted recent averages for retention, shares, saves, and non-follower reach. | 90 |
| 3 | Creator-adjusted lift model | Convert every metric into actual-vs-expected lift for that creator. | 88 |
| 4 | Momentum model | Track last 7/14/30-day growth, median reach, breakout frequency, and declining performance. | 80 |
| 5 | Follower-count bucket model | Group creators by follower bands only. | 37 |

## Recommended build

```text
Hierarchical Bayesian baseline
```

## Mathematical formulation

```text
ExpectedMetric =
f(platform, niche, creator, format, duration, recency)

MetricLift =
log((actual + ε) / (expected + ε))
```

## Required features

- historical retention
- historical share/save
- median non-follower reach
- posting cadence
- recent momentum
- format history
- policy/account health

## Training targets

- expected views
- expected non-follower reach
- expected shares/saves
- creator-adjusted lift

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Creator-adjusted lift should predict future expansion better than raw views, raw likes, or follower count.
```

## Failure modes

- Too little history for new creators
- Over-penalizing successful pivots
- Leaking future data into baselines

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
