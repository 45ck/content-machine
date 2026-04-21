# Nonstationary Bandit with Decay

## Purpose

Ad performance changes over time due to fatigue, seasonality, competitor moves, and audience depletion.

## Decayed posterior update

Before adding new observations:

```text
α_k ← 1 + ρ(α_k − 1)
β_k ← 1 + ρ(β_k − 1)
```

Where:

```text
ρ = memory retention, e.g. 0.95 daily
```

Then update with new success/failure.

## Use

Use for creative rotation and social ad systems.

## Rule

If the environment changes quickly, old data should not dominate current decisions.
