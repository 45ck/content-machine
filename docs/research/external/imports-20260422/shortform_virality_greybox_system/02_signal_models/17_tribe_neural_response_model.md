# TRIBE Neural-Response Model

## Signal

```text
TRIBEResponseScore
```

## Question answered

```text
Does predicted human neural response add useful pre-publish signal?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Adds predictive lift beyond multimodal baseline | 35% |
| Pre-publish usefulness | 25% |
| Neuroscience plausibility | 15% |
| Feasibility | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | ROI/time-window compression | Compress ~20k vertices into visual, auditory, language, social, attention, and value ROI features across time windows. | 94 |
| 2 | Hook neural-response features | Extract first-window peak, slope, volatility, and early response drop. | 86 |
| 3 | Retention decay features | Measure response decay, flatness, overload, and instability across the full clip. | 82 |
| 4 | Cross-modal neural alignment | Score whether audio, language, and visual events create coherent predicted response timing. | 78 |
| 5 | Raw vertex model | Feed raw cortical vertices directly into a model. | 21 |

## Recommended build

```text
ROI/time-window compression
```

## Mathematical formulation

```text
TRIBEFeatures =
{
  HookPeak,
  HookSlope,
  ResponseDecay,
  ResponseVolatility,
  CrossModalAlignment,
  VisualROI,
  AuditoryROI,
  LanguageROI,
  SocialROI,
  CognitiveLoadProxy
}
```

## Required features

- predicted cortical response
- ROI summaries
- time-window peaks
- response slopes
- volatility
- cross-modal alignment
- cognitive-load proxy

## Training targets

- incremental lift for scroll-stop
- incremental lift for retention
- incremental lift for shareability
- pairwise hook selection

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Keep TRIBE only if metadata + multimodal embeddings + TRIBE beats metadata + multimodal embeddings.
```

## Failure modes

- Average-subject mismatch
- Overfitting raw vertices
- Commercial license restrictions
- Neural features not adding lift

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
