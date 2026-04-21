# Audience Fit / Topic Routing Model

## Signal

```text
AudienceFit(video, cluster)
```

## Question answered

```text
Which audience cluster is most likely to respond well?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts cold-audience performance | 35% |
| Platform similarity | 25% |
| Data availability | 15% |
| Interpretability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Dual-tower video/audience model | One tower embeds the video; another embeds audience clusters from past viewers, commenters, and winning posts. | 95 |
| 2 | Historical winner clustering | Cluster the creator’s top-performing posts and infer audience clusters from them. | 90 |
| 3 | Topic taxonomy classifier | Classify niche, subtopic, format, viewer intent, expertise level, and emotional frame. | 84 |
| 4 | Commenter-interest graph | Use repeat commenters, their language, and comment embeddings to estimate audience interests. | 78 |
| 5 | Manual niche labels | Use human-labelled topics such as software, fitness, finance, memes, productivity, student life. | 61 |

## Recommended build

```text
Dual-tower video/audience model
```

## Mathematical formulation

```text
AudienceFit =
cosine(VideoEmbedding, AudienceClusterEmbedding)
```

## Required features

- video embeddings
- transcript embeddings
- caption embeddings
- comment embeddings
- historical winners
- audience cluster vectors
- topic taxonomy

## Training targets

- cluster-specific retention
- cluster-specific shares/saves
- non-follower reach quality
- follower vs non-follower performance

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
AudienceFit should predict above-baseline retention/share/save inside the predicted audience cluster.
```

## Failure modes

- Global topic match but wrong audience level
- Past audience traps that prevent exploration
- Weak labels for viewer clusters

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
