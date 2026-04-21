# TRIBE Lift Test

## Research question

Does TRIBE add predictive signal beyond normal multimodal content features?

## Features

```text
TRIBE_HookPeak
TRIBE_HookSlope
TRIBE_ResponseDecay
TRIBE_ResponseVolatility
TRIBE_VisualROI
TRIBE_AuditoryROI
TRIBE_LanguageROI
TRIBE_SocialROI
TRIBE_CrossModalAlignment
TRIBE_CognitiveLoadProxy
```

## Model comparison

```text
Model A: metadata only
Model B: metadata + multimodal embeddings
Model C: metadata + multimodal embeddings + TRIBE
```

## Targets

```text
viewed-vs-swiped
3s hold
APV
completion
shares/reach
saves/reach
top-decile normalized reach
```

## Pass condition

```text
Model C beats Model B on temporal holdout
```

Acceptable evidence:

```text
+5% PR-AUC
+5% nDCG@10
+10% pairwise hook-selection accuracy
better calibration for top-decile prediction
```

## Kill condition

Remove TRIBE if:

```text
no lift over multimodal baseline
high extraction cost
unstable performance
licensing prevents intended use
```
