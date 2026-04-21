# Scoring Criteria

Each build method is scored out of 100. The score is not a claim of platform weight. It is a build-priority score.

## Global scoring logic

```text
Build Score =
predictive lift
+ data availability
+ platform similarity
+ actionability
+ feasibility
+ interpretability
```

Different signals use different criterion weights because different signals have different purposes.

## Interpretation

```text
90–100 = build first; high signal value
80–89  = strong secondary method
70–79  = useful if data allows
60–69  = prototype or fallback
<60    = weak, naive, or insufficient alone
```

## Hard rule

A high build score does not guarantee the signal is useful. The signal must survive:

```text
temporal validation
ablation testing
calibration testing
platform-specific testing
```

## Recommended model-selection process

```text
1. Build the simple baseline.
2. Build the recommended method.
3. Compare against raw views, raw likes, metadata-only, and multimodal-only baselines.
4. Run ablation.
5. Keep only if it improves temporal holdout or live decision quality.
```
