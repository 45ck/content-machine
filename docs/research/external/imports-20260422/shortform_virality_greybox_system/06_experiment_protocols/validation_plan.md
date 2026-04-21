# Validation Plan

## Central question

Does the scoring system predict future normalized performance better than baseline methods?

## Baselines

```text
raw views
raw likes
metadata-only model
creator baseline only
multimodal content-only model
manual selection
```

## Primary metrics

```text
PR-AUC for top-decile performance
nDCG@10 for ranking drafts
Lift@10
Brier score
Expected Calibration Error
pairwise variant-selection accuracy
Spearman correlation with normalized reach
```

## Splitting

Use temporal holdout:

```text
Train: older videos
Validate: middle period
Test: newest period
```

Do not rely on random split.

## Target definitions

```text
top_decile_non_follower_reach_72h
top_decile_shares_per_reach_72h
top_decile_saves_per_reach_72h
top_decile_APV_by_duration
top_decile_ECR_by_duration
```

## Success criterion

```text
Model-ranked top 10% drafts outperform average by 2x+
on normalized reach/share/save metrics.
```
