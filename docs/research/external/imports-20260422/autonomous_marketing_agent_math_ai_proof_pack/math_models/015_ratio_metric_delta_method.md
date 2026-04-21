# Ratio Metric and Delta Method

## Purpose

CPA, ROAS, conversion rate, revenue per visitor, and activation rate are ratios.

## Ratio

```text
R = X / Y
```

Examples:

```text
CPA = spend / conversions
ROAS = revenue / spend
CVR = conversions / visits
```

## Problem

Ratios have non-trivial variance. Naive comparisons can mislead.

## Delta method approximation

For ratio `R = X/Y`:

```text
Var(R) ≈ (1/μ_Y²) Var(X)
       + (μ_X²/μ_Y⁴) Var(Y)
       − (2 μ_X / μ_Y³) Cov(X,Y)
```

## Agent rule

For ratio metrics, prefer:

- bootstrap,
- delta method,
- user-level aggregation,
- or Bayesian simulation.

Never compare ratios without uncertainty.
