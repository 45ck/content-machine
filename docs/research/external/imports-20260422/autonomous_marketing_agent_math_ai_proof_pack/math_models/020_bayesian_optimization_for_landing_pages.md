# Bayesian Optimization for Landing Pages

## Purpose

Optimize landing pages when variables are continuous, structured, or too many for brute-force A/B tests.

## Objective

```text
maximize f(x)
```

Where `x` may include:

```text
hero headline angle
proof order
CTA wording
pricing visibility
demo placement
form length
trial promise
```

## Surrogate model

```text
f(x) ~ GaussianProcess or tree-based surrogate
```

## Acquisition function

```text
Expected Improvement
Upper Confidence Bound
Probability of Improvement
```

## Use

Use after the basics are working and you have enough traffic.

## Warning

Do not optimize landing-page details before proving demand, offer, and proof path.
