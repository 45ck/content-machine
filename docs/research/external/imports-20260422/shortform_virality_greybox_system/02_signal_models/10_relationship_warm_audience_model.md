# Relationship / Warm-Audience Model

## Signal

```text
RelationshipScore
```

## Question answered

```text
How strong is the creator’s relationship with the seed audience?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts seed audience response | 30% |
| Separates warm vs cold audience | 25% |
| Data availability | 20% |
| Platform similarity | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Follower/non-follower split model | Model follower and non-follower performance separately. | 93 |
| 2 | Repeat-engager graph | Track repeat commenters, return viewers, recurring likers, and profile visitors. | 86 |
| 3 | Community tightness score | Measure concentration of engagement among loyal users versus broad audience. | 79 |
| 4 | Warm-start prediction model | Predict first-hour performance from recent follower behavior. | 76 |
| 5 | Raw follower engagement rate | Use likes/comments per follower as a rough proxy. | 58 |

## Recommended build

```text
Follower/non-follower split model
```

## Mathematical formulation

```text
RelationshipScore =
WarmAudienceRetention
+ WarmAudienceShareSave
+ RepeatViewerRate
+ ReturningCommenterRate
+ ProfileVisitRate
```

## Required features

- follower retention
- non-follower retention
- repeat commenters
- returning viewers
- profile visits
- community concentration

## Training targets

- first-hour seed performance
- follower engagement lift
- cold-audience transition quality

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
RelationshipScore should predict seed response but should not falsely predict broad non-follower expansion.
```

## Failure modes

- Strong fan base masking weak cold-audience fit
- Missing platform graph data
- Repeat commenters not representative of broader viewers

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
