# Failure Modes and Kill Conditions

## System-level failure modes

```text
overfitting to old trends
using future metrics in training
overweighting likes
ignoring negative feedback
using raw views as the main target
mixing platforms without calibration
treating TRIBE as an oracle
confusing warm-audience response with cold-audience potential
```

## Kill conditions

Kill or demote a model if:

```text
it fails temporal holdout
it does not beat simpler baselines
it cannot be calibrated
it causes poor publish decisions
it is too expensive for its lift
it relies on unavailable features
it cannot survive ablation
```

## False-positive diagnosis

A video scores high but fails. Check:

```text
eligibility/originality
wrong audience cluster
trend saturation
negative feedback
payoff mismatch
weak non-follower response
platform distribution anomaly
```

## False-negative diagnosis

A video scores low but succeeds. Check:

```text
unmodeled trend
external traffic
social controversy
creator community behavior
algorithmic exploration burst
novel format outside training data
```
