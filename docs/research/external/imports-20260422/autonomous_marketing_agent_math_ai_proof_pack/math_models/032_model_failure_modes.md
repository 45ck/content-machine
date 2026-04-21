# Model Failure Modes

## False certainty

The model gives precise numbers from poor data.

Fix: require uncertainty intervals and data-quality notes.

## Optimizing proxy metrics

The model optimizes CTR while paid conversion worsens.

Fix: define reward as activation, paid conversion, or profit.

## Attribution hallucination

The platform claims credit for conversions that would have happened anyway.

Fix: holdouts, lift tests, geo tests, or MMM calibration.

## Nonstationarity

Yesterday's winning creative dies today.

Fix: decay old evidence and monitor fatigue.

## Selection bias

The model learns from exposed users only.

Fix: randomized holdouts or causal methods.

## Leakage

Post-treatment data sneaks into predictors.

Fix: strict feature timing.

## Bad priors

Overconfident priors dominate real evidence.

Fix: use weak priors unless strong historical evidence exists.
