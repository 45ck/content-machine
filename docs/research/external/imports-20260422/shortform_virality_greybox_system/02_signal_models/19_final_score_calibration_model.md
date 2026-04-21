# Final Score / Calibration Model

## Signal

```text
ViralPotentialScore and LiveBreakoutScore
```

## Question answered

```text
How do we combine all sub-signals into one useful decision score?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts top-decile normalized performance | 35% |
| Calibration quality | 20% |
| Platform-specific accuracy | 20% |
| Interpretability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Stacked ensemble of specialist models | Feed all sub-model outputs into LightGBM/CatBoost/logistic calibrator. | 97 |
| 2 | Platform-specific final models | Separate TikTok, Reels, and Shorts calibrators. | 94 |
| 3 | Pairwise draft ranker | Rank Hook A vs Hook B vs Hook C instead of predicting absolute views. | 88 |
| 4 | Bayesian final model | Output probability and uncertainty intervals, not just a fixed score. | 84 |
| 5 | Hand-weighted formula | Manually combine scores before enough data exists. | 63 |

## Recommended build

```text
Stacked ensemble plus platform-specific calibrators
```

## Mathematical formulation

```text
VPS-P =
P(top_decile_normalized_performance | pre_publish_signals)

VPS-L(t) =
P(top_decile_24h_or_72h_performance | pre_publish_signals + early_metrics)
```

## Required features

- all specialist model outputs
- platform
- creator baseline
- normalized metrics
- early live metrics
- trend state

## Training targets

- top-decile normalized performance
- 24h/72h breakout
- rank quality
- calibrated probability

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Top 10% model-ranked drafts should outperform average drafts by 2x+ on normalized reach/share/save metrics.
```

## Failure modes

- Hand-weighting forever
- One global model for all platforms
- Data leakage via future metrics

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
