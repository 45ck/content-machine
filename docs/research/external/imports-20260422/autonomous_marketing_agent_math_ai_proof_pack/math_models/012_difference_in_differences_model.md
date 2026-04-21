# Difference-in-Differences Model

## Purpose

Estimate causal effect from treatment/control and pre/post data.

## Model

```text
Y_it = α + β Treatment_i + γ Post_t + δ (Treatment_i × Post_t) + ε_it
```

The treatment effect is:

```text
δ
```

## Assumption

Parallel trends:

```text
control trend approximates what treatment trend would have been without treatment
```

## Use

Use for campaigns, product changes, geo rollouts, and audience holdouts.

## Failures

Do not trust DiD when treatment and control groups were already moving differently before the intervention.
