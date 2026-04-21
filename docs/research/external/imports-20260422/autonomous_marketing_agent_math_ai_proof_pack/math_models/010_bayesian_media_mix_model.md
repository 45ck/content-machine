# Bayesian Media Mix Model

## Purpose

Estimate channel-level impact when user-level randomized experiments are unavailable or incomplete.

## Model

```text
y_t ~ Normal(μ_t, σ)
μ_t = baseline_t + season_t + trend_t
      + Σ_j β_j × saturation_j(adstock_j(spend_{j,t}))
      + Σ_k γ_k control_{k,t}
```

## Priors

```text
β_j ~ HalfNormal(scale)
λ_j ~ Beta(a, b)
k_j ~ LogNormal(m, s)
σ ~ HalfNormal(scale)
```

## Outputs

```text
channel_contribution
ROAS
mROAS
credible_intervals
budget_reallocation_recommendations
```

## Use

Use when campaigns span multiple channels and last-click reporting is misleading.

## External frameworks

Google Meridian is a Bayesian causal inference MMM framework.
Meta Robyn is an open-source, AI/ML-powered MMM package.

## Warning

MMM is not magic. It needs data quality, variation in spend, controls, and calibration from experiments when possible.
