# Conformal prediction and uncertainty layer

## Purpose

AI predictions should not be trusted as point estimates. Every forecast should carry uncertainty.

## Use cases

```text
predict likely CTV range before publishing
predict likely APV range from features
predict save/share potential
flag assets outside known distribution
```

## Conformal prediction concept

Given historical examples, create prediction intervals that aim to cover future outcomes at a chosen level.

Example output:

```text
Predicted APV: 54%
80% prediction interval: 42%–66%
```

Decision:

```text
If interval is wide, do not over-trust forecast.
If lower bound beats baseline, asset is strong.
If upper bound below baseline, rewrite before posting.
```

## Practical conformal workflow

```text
1. Train or fit a prediction model on creative features → metric.
2. Use a calibration set of prior posts.
3. Compute residuals between predictions and actual metrics.
4. Build prediction interval from residual quantiles.
5. Output point forecast + interval + confidence label.
```

## Confidence labels

```text
High confidence:
creative features are similar to historical data and interval is narrow.

Medium confidence:
some novelty or moderate interval.

Low confidence:
new platform/form/niche or wide interval.
```

## Guardrail

A model may recommend an asset, but quality gates can still reject it.
