# Saveability / Utility Model

## Signal

```text
SaveScore
```

## Question answered

```text
Will the viewer save this because it is useful later?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts saves per reach | 35% |
| Practical actionability | 25% |
| Pre-publish usability | 20% |
| Data availability | 10% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Utility-content classifier | Detect tutorials, recipes, workflows, checklists, frameworks, templates, code snippets, routines, and reference content. | 93 |
| 2 | Information-density model | Score useful information per second, not just total information. | 87 |
| 3 | Step-structure detector | Detect numbered steps, before/after, do-this, avoid-this, and process clarity. | 84 |
| 4 | Revisit-intent LLM judge | Score whether a viewer would need this later. | 77 |
| 5 | Caption/CTA save detector | Detect explicit save-this prompts and save-oriented captions. | 62 |

## Recommended build

```text
Utility-content classifier
```

## Mathematical formulation

```text
SaveScore =
PracticalValue
+ StepClarity
+ ReferenceDensity
+ FutureUsefulness
- CognitiveLoad
```

## Required features

- tutorial format
- step structure
- checklist presence
- reference density
- clarity
- future usefulness
- information per second

## Training targets

- saves per reach
- bookmarks per reach
- return views
- profile visits from saved content

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
SaveScore should predict saves/reach better than a generic engagement score.
```

## Failure modes

- Dense but unusable information
- CTA without value
- Useful content that is too slow for short-form

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
