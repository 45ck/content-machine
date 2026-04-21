# Power, Sample Size, and Minimum Detectable Effect

## Purpose

Avoid tests that cannot possibly detect useful effects.

## Approximate binary sample size per group

```text
n ≈ 2 × (z_{1−α/2} + z_power)^2 × p(1−p) / δ^2
```

Where:

```text
p = baseline rate
δ = minimum detectable absolute difference
```

## Example intuition

Low conversion rates require large samples. If traffic is small, test larger effects higher in the funnel or use Bayesian decision thresholds for operational learning.

## Agent rule

Before launching a formal A/B test, compute whether the planned sample can detect the needed effect.
