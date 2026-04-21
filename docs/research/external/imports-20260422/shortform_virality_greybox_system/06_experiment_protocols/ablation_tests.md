# Ablation Tests

## Required ablations

Train the full model, then remove one signal block at a time.

```text
Full model
minus CreatorBaseline
minus ScrollStop
minus Retention
minus PositiveIntent
minus Shareability
minus Saveability
minus AudienceFit
minus Eligibility
minus NegativeRisk
minus TrendFreshness
minus Saturation
minus TRIBE
```

## Keep rule

Keep a signal if removing it worsens:

```text
PR-AUC
nDCG@10
Lift@10
Brier score
calibration
pairwise selection accuracy
```

## Kill rule

Remove or demote a signal if:

```text
no lift on temporal holdout
unstable coefficients
poor calibration
high feature cost
model leakage risk
hard to interpret
```

## TRIBE special rule

TRIBE must beat the multimodal baseline:

```text
metadata + multimodal embeddings + TRIBE
>
metadata + multimodal embeddings
```

If not, discard TRIBE from production and keep it only for research.
