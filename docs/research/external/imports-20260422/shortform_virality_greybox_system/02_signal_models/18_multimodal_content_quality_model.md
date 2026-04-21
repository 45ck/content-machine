# Multimodal Content-Quality Model

## Signal

```text
ContentQualityScore
```

## Question answered

```text
Ignoring account and distribution, is the content itself likely to engage?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts content-only engagement | 30% |
| Multimodal completeness | 25% |
| Pre-publish usability | 20% |
| Feasibility | 15% |
| Interpretability | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Video/audio/text embedding model | Extract video embeddings, audio embeddings, transcript embeddings, caption embeddings, and OCR embeddings. | 95 |
| 2 | Large multimodal model judge | Use an LMM to score clarity, hook, pacing, novelty, social value, usefulness, and risk. | 84 |
| 3 | Feature-engineered content model | Use cut rate, speech rate, caption density, visual salience, audio energy, motion, faces, objects. | 82 |
| 4 | Transcript/caption-only model | Predict from language, topic, hook, and caption structure. | 67 |
| 5 | Visual-only model | Predict from frames only. | 61 |

## Recommended build

```text
Video/audio/text embedding model
```

## Mathematical formulation

```text
ContentQualityScore =
f(video_embedding, audio_embedding, transcript_embedding, caption_embedding, OCR_embedding)
```

## Required features

- frame embeddings
- video motion embeddings
- audio embeddings
- speech transcript
- caption embeddings
- OCR text
- metadata

## Training targets

- NAWP
- ECR
- APV
- completion
- shares/saves per reach

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Content-only model should predict normalized APV/ECR/share/save better than metadata-only baseline.
```

## Failure modes

- Learning creator/account leakage
- Missing audio contribution
- Black-box model without actionable diagnostics

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
