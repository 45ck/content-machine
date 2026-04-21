# Scroll-Stop / Hook Model

## Signal

```text
StopScore = P(viewed instead of swiped)
```

## Question answered

```text
Will the viewer stop in the first 1–3 seconds?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Direct fit to stop/swipe behavior | 30% |
| Pre-publish usability | 25% |
| Data availability | 20% |
| Editing actionability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | 0–3s multimodal hook model | Use first 3 seconds of video, audio, transcript, captions, OCR text, motion, and first-frame features. | 96 |
| 2 | Viewed-vs-swiped supervised model | Train directly on YouTube Shorts viewed-vs-swiped data, then adapt to TikTok/Reels using 1s/3s hold proxies. | 94 |
| 3 | First-frame salience model | Score face/object/text visibility, contrast, novelty, recognizability, and visual clarity. | 88 |
| 4 | Hook-language classifier | Score curiosity gap, contradiction, specificity, payoff promise, social stakes, and clarity. | 85 |
| 5 | TRIBE hook-response model | Run TRIBE on the opening seconds and compress predicted brain response into hook peak, slope, and volatility features. | 76 |

## Recommended build

```text
0–3s multimodal hook model plus viewed-vs-swiped supervised label
```

## Mathematical formulation

```text
ScrollStopScore =
P(viewed_not_swiped | first_3s_video_audio_text_features)
```

## Required features

- first frame salience
- motion in first 500ms/1s/3s
- speech onset time
- caption onset time
- first phrase specificity
- visual surprise
- TRIBE hook peak/slope

## Training targets

- viewed vs swiped
- 1-second hold
- 3-second hold
- 5-second hold

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Top-decile ScrollStopScore videos should materially outperform baseline on viewed-vs-swiped or 3-second hold.
```

## Failure modes

- Optimizing shock instead of value
- Ignoring audience fit
- Learning platform-counting artifacts instead of true scroll-stop

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
