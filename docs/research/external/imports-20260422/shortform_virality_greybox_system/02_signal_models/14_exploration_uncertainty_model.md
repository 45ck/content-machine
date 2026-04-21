# Exploration / Uncertainty Model

## Signal

```text
ExplorationBonus
```

## Question answered

```text
Should the system test this even if confidence is low?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Improves testing efficiency | 30% |
| Handles uncertainty | 25% |
| Avoids over-exploitation | 20% |
| Practical deployment | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Contextual bandit variant selector | Use UCB or Thompson sampling to choose which content variants to test. | 93 |
| 2 | Model-uncertainty bonus | Use ensemble disagreement or Bayesian uncertainty to boost under-tested ideas. | 89 |
| 3 | Novelty × relevance model | Reward ideas that are novel but still close to proven audience clusters. | 84 |
| 4 | Portfolio optimizer | Allocate publishing slots between safe winners, trend tests, experiments, and format exploration. | 79 |
| 5 | Random exploration | Randomly test variants. | 42 |

## Recommended build

```text
Contextual bandit variant selector
```

## Mathematical formulation

```text
TestScore =
PredictedUtility
+ c·Uncertainty
+ NoveltyBonus
- NegativeRisk
```

## Required features

- model uncertainty
- novelty
- audience fit
- eligibility
- negative risk
- variant family
- historical tests per cluster

## Training targets

- variant win rate
- long-term top-decile hit rate
- learning efficiency
- regret reduction

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Bandit-selected variants should outperform random selection and manual selection over repeated tests.
```

## Failure modes

- Exploring low-quality risky content
- Insufficient variants
- Feedback delay causing bad bandit updates

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
