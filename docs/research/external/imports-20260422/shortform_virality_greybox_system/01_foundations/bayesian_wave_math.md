# Bayesian Expansion-Wave Math

## Core assumption

Platforms do not expose every video to everyone immediately. They test content on progressively broader audiences.

A rational expansion rule:

```text
Expand if P(Quality_v > Threshold_k | observed wave data) > c
```

Where:

```text
Quality_v = latent content quality for the current audience
Threshold_k = required quality for wave k
c = confidence threshold
```

## Beta-Binomial update

For a binary metric such as share, completion, save, or viewed-not-swiped:

```text
q_m ~ Beta(α0, β0)
```

After `n` impressions and `x` successes:

```text
q_m | data = Beta(α0 + x, β0 + n - x)
```

## Multi-metric wave quality

```text
QualityScore_k =
w_stop · q_stop
+ w_retention · q_retention
+ w_share · q_share
+ w_save · q_save
+ w_follow · q_follow
- w_negative · q_negative
```

## Expansion probability

```text
P_expand_k =
P(QualityScore_k > θ_k | observed wave data)
```

## Dynamic threshold

```text
θ_k =
θ0
+ a · log(1 + k)
+ b · AudienceDistance_k
+ c · CompetitionPressure_t
+ d · Saturation_k
- e · TrendBoost_t
```

## Dashboard interpretation

```text
P_expand_1 > 0.80 -> likely first expansion
P_expand_2 > 0.65 -> likely second wave
P_expand_3 < 0.40 -> likely stall before broad audience
```
