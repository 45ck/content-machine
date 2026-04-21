# Normalization Math

Raw views are unstable because they depend on:

```text
account size
follower quality
platform
duration
niche
format
post time
trend state
prior creator trust
distribution pool
```

## Baseline-normalized metric

For metric `m`:

```text
Lift_m(v) =
log(
  (rate_m(v) + ε)
  /
  (baseline_m[platform, niche, duration, format, creator] + ε)
)
```

Optionally compress:

```text
z_m(v) = tanh(Lift_m(v))
```

## Why log-ratio works

The real question is not:

```text
Did this video get many shares?
```

The useful question is:

```text
Did this video get more shares than expected for this creator, niche, duration, and platform?
```

## Recommended targets

```text
top_decile_views_per_follower
top_decile_non_follower_reach
top_decile_shares_per_reach
top_decile_saves_per_reach
top_decile_APV_by_duration
top_decile_ECR_by_duration
```

## Avoid

```text
raw views alone
raw likes alone
absolute completion rate without duration bucket
watch time without length adjustment
```
