# MMM Synthetic Data Spec

## Purpose

Create synthetic data to test MMM reasoning.

## Data generation

```text
baseline = trend + seasonality
channel_effect = beta × saturation(adstock(spend))
outcome = baseline + sum(channel_effects) + noise
```

## Agent test

Given synthetic data, can the agent recover:

- which channel worked,
- which channel saturated,
- which channel has delayed effect,
- what budget shift is justified.
