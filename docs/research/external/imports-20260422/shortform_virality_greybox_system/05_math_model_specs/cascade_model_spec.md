# Cascade Model Specification

## Use case

Only useful after the video has early traction.

## Simple self-exciting model

Let `N(t)` be cumulative views or shares.

Intensity:

```text
λ(t) =
base_rate(t)
+ Σ_i κ · exp(-β(t - t_i))
```

Where each event `t_i` increases future intensity temporarily.

## Practical feature version

```text
CascadeScore =
views_per_minute
+ share_velocity
+ save_velocity
+ comment_velocity
+ acceleration
+ external_traffic_proxy
- decay_rate
```

## Outputs

```text
expected_24h_reach
expected_72h_reach
expected_7d_reach
probability_of_second_wave
probability_of_stall
```

## Validation

Compare against:

```text
raw first-hour views
simple exponential decay
velocity-only model
Bayesian wave model
```
