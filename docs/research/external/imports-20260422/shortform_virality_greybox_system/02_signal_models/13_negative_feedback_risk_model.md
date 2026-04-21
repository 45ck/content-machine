# Negative Feedback Risk Model

## Signal

```text
NegativeRisk
```

## Question answered

```text
Will viewers swipe, dislike, hide, report, mark not interested, or feel baited?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts expansion failure | 35% |
| Detects strong penalties | 25% |
| Pre-publish usability | 15% |
| Data availability | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Multi-task negative-risk model | Predict skip, not-interested, dislike, hide, report, and low satisfaction together. | 96 |
| 2 | Hook-payoff mismatch detector | Compare promised payoff in first seconds with actual payoff quality later. | 91 |
| 3 | Confusion / overload model | Detect visual clutter, dense captions, unclear premise, bad audio, and excessive topic shifts. | 87 |
| 4 | Ragebait / toxicity model | Score hostility, outrage, insult, polarization, manipulation, or baiting. | 80 |
| 5 | Technical discomfort model | Detect clipping, harsh sound, flicker, shaky footage, unreadable text, and poor pacing. | 75 |

## Recommended build

```text
Multi-task negative-risk model
```

## Mathematical formulation

```text
NegativeRisk =
0.35·P(skip)
+ 0.25·P(not_interested)
+ 0.20·P(report)
+ 0.10·P(dislike)
+ 0.10·P(hide)
```

## Required features

- skip prediction
- hook-payoff mismatch
- visual clutter
- caption density
- toxicity
- audio discomfort
- policy risk
- audience mismatch

## Training targets

- skip/swipe rate
- not interested rate
- hide rate
- dislike rate
- report rate
- satisfaction proxy

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
NegativeRisk should explain videos with high early views but weak expansion or rapid stall.
```

## Failure modes

- Confusing controversial success with bad risk
- Missing hidden negative feedback metrics
- Overweighting toxicity in niches where debate is normal

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
