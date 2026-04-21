# Model Training Pipeline

## Training order

```text
1. Creator baseline
2. Scroll-stop model
3. Retention model
4. Intent model
5. Negative risk model
6. Audience fit model
7. Eligibility gate
8. Content-quality model
9. Final pre-publish score
10. Live expansion-wave score
11. TRIBE lift layer
12. Trend/saturation models
```

## Dataset split

Use temporal validation:

```text
train: oldest videos
validation: middle period
test: newest period
```

Avoid random-only split because it leaks trends and creator momentum.

## Model families

| Signal | Prototype model | Mature model |
|---|---|---|
| Creator baseline | hierarchical Bayesian / EWMA | hierarchical Bayesian + state-space |
| Scroll-stop | LightGBM / XGBoost | multimodal transformer |
| Retention | survival model | temporal transformer survival model |
| Intent | multi-task gradient boosting | multi-task neural network |
| Audience fit | clustering + cosine | dual-tower retrieval |
| Negative risk | LightGBM | multi-task classifier |
| Expansion wave | Bayesian posterior | Bayesian + stacked model |
| Cascade | velocity model | Hawkes / neural cascade |
| Final score | stacked LightGBM | platform-specific calibrated ensemble |

## Training loop

```text
extract features
build normalized labels
train specialist models
calibrate outputs
train final stacked model
run ablations
run temporal holdout
write model cards
register models
deploy only if pass criteria met
```

## Leakage checks

Do not include:

```text
future metrics in pre-publish models
post-publish metrics in pre-publish features
creator baselines calculated using future videos
trend features calculated using future posts
manual labels created after knowing performance without tracking that bias
```
