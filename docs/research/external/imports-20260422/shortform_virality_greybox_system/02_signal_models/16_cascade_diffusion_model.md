# Cascade / Diffusion Model

## Signal

```text
CascadeScore
```

## Question answered

```text
How far can this spread after early sharing begins?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts final reach | 30% |
| Captures share velocity | 25% |
| Works with early data | 20% |
| Platform portability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Self-exciting velocity model | Model views/shares as an intensity process where new sharing creates more exposure. | 89 |
| 2 | Early acceleration model | Predict 24h/72h reach from view/share/save velocity and acceleration. | 87 |
| 3 | Share cascade proxy | Track shares per minute, shares per reach, external traffic, reposts, remixes, and comment tagging. | 83 |
| 4 | Graph cascade model | Use network/cascade structure if detailed graph data exists. | 72 |
| 5 | Simple decay curve | Fit exponential/logistic growth and decay to early views. | 65 |

## Recommended build

```text
Self-exciting velocity model
```

## Mathematical formulation

```text
CascadeScore =
CurrentVelocity
+ ShareAcceleration
+ ResharePotential
- DecayRate
```

## Required features

- views per minute
- share velocity
- save velocity
- comment velocity
- acceleration
- decay
- external traffic
- reshare rate

## Training targets

- 24h reach
- 72h reach
- 7d reach
- final reach
- cascade size

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
CascadeScore should improve 72h/final reach prediction after the first 30–60 minutes.
```

## Failure modes

- No access to share graph
- Organic platform expansion mixed with external cascade
- Small sample early velocity noise

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
