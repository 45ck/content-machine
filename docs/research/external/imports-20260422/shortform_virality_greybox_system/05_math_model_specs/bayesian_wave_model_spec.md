# Bayesian Wave Model Specification

## Inputs

At checkpoint `t`:

```text
shown_in_feed
views
viewed_vs_swiped
average_percentage_viewed
completion
shares
saves
comments
follows
negative feedback
```

## Metric posterior

For binary metric `m`:

```text
q_m ~ Beta(α0_m, β0_m)

q_m | data =
Beta(α0_m + x_m, β0_m + n_m - x_m)
```

## Quality distribution

Approximate quality by Monte Carlo:

```text
for sample s in 1..N:
    draw q_stop_s
    draw q_retention_s
    draw q_share_s
    draw q_save_s
    draw q_negative_s

    quality_s =
      w_stop q_stop_s
    + w_retention q_retention_s
    + w_share q_share_s
    + w_save q_save_s
    - w_negative q_negative_s
```

## Expansion probability

```text
P_expand_k = mean(quality_s > θ_k)
```

## Threshold

```text
θ_k =
θ0
+ a log(1+k)
+ b AudienceDistance_k
+ c CompetitionPressure_t
+ d Saturation
- e TrendBoost
```

## Output

```text
P_expand_1
P_expand_2
P_expand_3
expected_24h_reach
expected_72h_reach
stall_reason
```
