# Shareability Psychology Model

## Signal

```text
ShareabilityScore
```

## Question answered

```text
Would someone send this to another person?
```

## Build-ranking criterion

| Criterion | Weight |
|---|---|
| Predicts shares per reach | 35% |
| Psychological support | 20% |
| Pre-publish usability | 20% |
| Interpretability | 15% |
| Feasibility | 10% |

## Five ways to build this signal

| Rank | Method | How we make it | Build Score |
|---|---|---|---|
| 1 | Social-value classifier | Score whether the video makes the sender look smart, funny, helpful, informed, moral, or in-group aligned. | 94 |
| 2 | Practical-value model | Detect checklist, tutorial, framework, warning, tool, hack, template, or useful-later content. | 90 |
| 3 | Identity-signal model | Detect professional, lifestyle, belief, tribe, status, or taste-signalling content. | 86 |
| 4 | Arousal/emotion model | Score awe, humor, anger, anxiety, surprise, tension, relief, and moral intensity. | 81 |
| 5 | TRIBE social/self proxy | Add compressed TRIBE features from social/self/language/value-related regions as experimental lift. | 73 |

## Recommended build

```text
Social-value classifier plus practical-value model
```

## Mathematical formulation

```text
ShareabilityScore =
SocialCurrency
+ PracticalValue
+ IdentitySignal
+ Arousal
+ FriendTagPotential
- ConfusionPenalty
- TooNichePenalty
```

## Required features

- social currency
- friend-tag potential
- identity signal
- usefulness
- warning value
- debate potential
- emotion/arousal
- TRIBE social ROI

## Training targets

- shares per reach
- DM shares per reach
- reposts per reach
- remixes/stitches per reach

## Minimum viable implementation

1. Define the target metric and baseline bucket.
2. Extract the features listed above.
3. Train the simplest defensible model first: usually LightGBM, XGBoost, CatBoost, logistic regression, or a survival model.
4. Evaluate using temporal holdout.
5. Add heavier neural/multimodal layers only if the baseline is beaten.
6. Store this signal as a calibrated sub-score in the feature store.

## Validation test

```text
Top-decile ShareabilityScore videos should reach at least 2x median shares/reach after normalizing by account, niche, and length.
```

## Failure modes

- Mistaking controversy for durable shareability
- Too niche to share broadly
- High share intent but low eligibility

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
