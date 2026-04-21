# Audience Pool / Reach Ceiling Model

## Signal

```text
AudiencePool_k
```

## Question answered

```text
How large is the reachable audience for this topic and format?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts reach ceiling | 30% |
| Demand/supply accuracy | 25% |
| Platform specificity | 20% |
| Data availability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Demand/supply pool model | Estimate topic demand, competing content volume, creator access, and trend growth. | 91 |
| 2 | Historical ceiling model | Estimate reach ceiling from prior posts in same topic/format/duration bucket. | 88 |
| 3 | Keyword/hashtag/search demand model | Track hashtags, search terms, captions, and platform search traffic proxies. | 82 |
| 4 | Trend-audience model | Estimate pool from users engaging with a sound, meme, format, or trend. | 78 |
| 5 | Static topic-size model | Assign rough audience sizes to broad categories. | 55 |

## Recommended build

```text
Demand/supply pool model
```

## Mathematical formulation

```text
AudiencePool =
TopicDemand
× PlatformDemand
× CreatorAccess
× TrendBoost
× LanguageLocationFit
÷ CompetitionVolume
```

## Required features

- topic demand
- platform demand
- competition volume
- trend size
- creator access
- language/location fit

## Training targets

- max plausible reach
- non-follower reach ceiling
- topic-adjusted performance

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
AudiencePool should improve prediction of maximum plausible reach for high-quality videos that stall due to small addressable audience.
```

## Failure modes

- Overestimating niche size
- Ignoring creator access
- Confusing trend popularity with reachable pool

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
