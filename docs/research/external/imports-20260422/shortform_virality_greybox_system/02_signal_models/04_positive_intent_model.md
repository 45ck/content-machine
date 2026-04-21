# Positive Intent Model

## Signal

```text
IntentScore
```

## Question answered

```text
Will the viewer like, comment, share, save, follow, subscribe, remix, or visit profile?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts expansion-relevant actions | 30% |
| Separates weak from strong intent | 25% |
| Data availability | 20% |
| Platform similarity | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Multi-task intent model | One model predicts P(like), P(comment), P(share), P(save), P(follow), and P(profile visit). | 95 |
| 2 | Weighted intent utility model | Manually or empirically weight shares/saves/follows above likes. | 91 |
| 3 | Separate specialist heads | Train separate share, save, comment, follow, and like models, then combine. | 87 |
| 4 | LLM intent classifier | Use transcript/caption/visual description to score usefulness, debate, identity, humor, CTA, and follow reason. | 79 |
| 5 | CTA-only model | Detect explicit save/share/comment/follow prompts. | 58 |

## Recommended build

```text
Multi-task intent model
```

## Mathematical formulation

```text
IntentScore =
0.30·P(share)
+ 0.25·P(save)
+ 0.15·P(comment)
+ 0.15·P(follow)
+ 0.10·P(like)
+ 0.05·P(profile_visit)
```

## Required features

- topic usefulness
- identity relevance
- humor
- debate trigger
- CTA
- authority signal
- series potential
- visual novelty

## Training targets

- likes per reach
- comments per reach
- shares per reach
- saves per reach
- follows per reach
- profile visits per reach

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
IntentScore should predict non-follower reach better than like-rate alone.
```

## Failure modes

- Overweighting likes
- Comment-bait creating negative risk
- CTA detection without true value

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
