# CUPED Variance Reduction Model

## Purpose

Reduce experiment noise by using pre-experiment data.

## Formula

Let:

```text
Y = experiment outcome
X = pre-experiment covariate
θ = Cov(Y, X) / Var(X)
Y_cuped = Y − θ (X − mean(X))
```

Analyze `Y_cuped` instead of `Y`.

## Why it works

If `X` is correlated with `Y` and unaffected by treatment, variance drops.

## Use

Use for high-noise online experiments where users have pre-period behavior.

## Requirements

- pre-treatment covariate exists,
- covariate is not affected by treatment,
- covariate correlates with outcome.

## Agent rule

When planning an experiment, always ask:

```text
What pre-period behavior can reduce variance?
```
