# Retention / Watch-Time Model

## Signal

```text
RetentionScore
```

## Question answered

```text
Will the viewer keep watching, complete, or rewatch?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Direct fit to watch behavior | 30% |
| Duration normalization | 20% |
| Segment-level diagnosis | 20% |
| Data availability | 15% |
| Editing actionability | 15% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Survival-curve model | Predict S(t)=P(viewer still watching at second t), then derive watch time, APV, completion, and end retention. | 97 |
| 2 | Sequence transformer retention model | Use frame/audio/text sequences to predict retention curve and drop-off points. | 91 |
| 3 | Pacing feature model | Use cut rate, speech pace, silence, subtitle density, motion, scene changes, and information density. | 87 |
| 4 | Open-loop / payoff timing model | Detect when the hook promise is made, when payoff arrives, and whether the delay is too long. | 83 |
| 5 | TRIBE response-decay model | Use predicted neural response drop, volatility, flatness, and overload as retention features. | 78 |

## Recommended build

```text
Survival-curve retention model
```

## Mathematical formulation

```text
ExpectedWatchSeconds = ∫ S(t) dt
AveragePercentageViewed = ExpectedWatchSeconds / VideoLength
CompletionRate = S(VideoLength)
LoopValue = E(max(WatchTime - VideoLength, 0)) / VideoLength
```

## Required features

- cut rate
- speech pace
- subtitle density
- scene-change timing
- dead air
- payoff timing
- loop structure
- audio energy curve
- TRIBE response decay

## Training targets

- average percentage viewed
- completion rate
- rewatch rate
- end retention
- retention curve points

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Predicted weak segments should align with real retention drop-offs and beat duration-only baselines.
```

## Failure modes

- Confusing short length with high quality
- Overfitting to creator style
- Not using duration buckets

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
