# Trend Freshness Model

## Signal

```text
FreshnessScore
```

## Question answered

```text
Is this topic, sound, meme, format, or angle rising right now?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts short-term lift | 30% |
| Detects trend lifecycle | 25% |
| Platform specificity | 20% |
| Data availability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Trend velocity model | Track growth rate of sounds, hashtags, topics, formats, and keyword clusters. | 92 |
| 2 | Trend lifecycle classifier | Classify emerging, accelerating, peak, decaying, or dead. | 87 |
| 3 | Demand/supply trend model | Compare audience demand against volume of competing similar posts. | 85 |
| 4 | Creator-trend fit model | Score whether this creator’s audience historically responds to this trend type. | 80 |
| 5 | Manual trend tracker | Human-curated trend list with subjective timing. | 61 |

## Recommended build

```text
Trend velocity model
```

## Mathematical formulation

```text
FreshnessScore =
TrendVelocity
× TrendRelevance
× CreatorFit
× PlatformFit
```

## Required features

- sound growth
- hashtag growth
- topic search trend
- format velocity
- keyword clusters
- trend age
- creator-trend historical fit

## Training targets

- above-baseline reach
- trend-adjusted lift
- early velocity bonus

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
FreshnessScore should predict above-baseline reach better than raw trend popularity.
```

## Failure modes

- Chasing trends after peak
- High trend popularity with low creator fit
- Poor data access to platform trend volume

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
