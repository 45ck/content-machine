# Saturation / Fatigue Model

## Signal

```text
SaturationPenalty
```

## Question answered

```text
Is this topic, hook, format, or sound already overused?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts decline/stall risk | 30% |
| Detects overuse | 25% |
| Pre-publish actionability | 20% |
| Data availability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Embedding-density saturation model | Measure density of similar recent videos in visual/text/audio embedding space. | 93 |
| 2 | Creator repetition model | Compare draft to creator’s last N posts for topic, format, hook, and sound similarity. | 88 |
| 3 | Trend-age decay model | Penalize trends based on time since acceleration/peak. | 82 |
| 4 | Template fatigue detector | Detect repeated hook structures, captions, transitions, meme formats, and editing templates. | 80 |
| 5 | Hashtag overuse model | Penalize heavily used hashtags or generic topic tags. | 56 |

## Recommended build

```text
Embedding-density saturation model
```

## Mathematical formulation

```text
SaturationPenalty =
RecentSimilarityDensity
× TrendAge
× CreatorRepetition
× CompetitionVolume
```

## Required features

- embedding density
- similarity to recent posts
- sound overuse
- template repetition
- trend age
- competition volume

## Training targets

- stall after early views
- declining reach by format/topic
- lower expansion probability despite good metrics

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
High SaturationPenalty should predict weaker reach for otherwise high-quality videos.
```

## Failure modes

- Penalizing evergreen topics
- Missing platform-specific fatigue
- Similarity model too broad

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
