# Eligibility / Originality Gate

## Signal

```text
Eligibility(v) ∈ [0, 1]
```

## Question answered

```text
Can the platform safely recommend this video?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Suppression-prediction power | 30% |
| Detectable before posting | 25% |
| Platform similarity | 20% |
| Actionability | 15% |
| Implementation feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Hybrid eligibility gate | Combine rules, OCR, watermark detection, duplicate detection, safety classifier, audio risk, technical quality, and account-health flags. | 94 |
| 2 | Originality / duplicate detector | Use perceptual hashing, audio fingerprinting, frame similarity, transcript similarity, and near-duplicate search against your own library and known reposts. | 91 |
| 3 | Policy / safety classifier | Classify regulated, violent, sexual, medical, misleading, shocking, hateful, or otherwise recommendation-risky material. | 86 |
| 4 | Technical quality gate | Score aspect ratio, resolution, bitrate, crop, dead frames, volume, clipping, compression artifacts, unreadable captions. | 82 |
| 5 | Account-health anomaly detector | Detect when normal engagement produces abnormally low non-follower reach, implying account-level or eligibility suppression. | 78 |

## Recommended build

```text
Hybrid eligibility gate
```

## Mathematical formulation

```text
EligibilityScore =
Originality
× PolicySafety
× TechnicalQuality
× AccountHealth
× CopyrightRiskInverse
```

## Required features

- OCR text and captions
- watermark flags
- frame and audio fingerprints
- policy/safety classifier outputs
- aspect ratio and export quality
- account restriction/anomaly flags

## Training targets

- recommendation eligibility if exposed
- non-follower reach anomaly
- distribution suppression flag
- manual policy review label

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
High-risk videos should show normal follower engagement and normal retention but unusually low non-follower/recommendation reach.
```

## Failure modes

- Over-penalizing edgy but allowed content
- Missing account-level restrictions not visible in analytics
- Confusing low-quality content with policy suppression

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
