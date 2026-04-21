# Original Key Equations

## Expected utility ranking

```text
U(σ) = Σ_r π_r · q_{σ(r)}
```

Optimal ordering:

```text
rank videos by descending expected utility
```

## Viewer utility

```text
R =
w_1 · WatchSeconds
+ w_2 · Completion
+ w_3 · Rewatch
+ w_4 · Share
+ w_5 · Save
+ w_6 · Comment
+ w_7 · Follow
- w_8 · Swipe
- w_9 · NotInterested
- w_10 · Report
```

## Retention

```text
E[min(T, L)] = ∫_0^L S(t) dt
CompletionRate = S(L)
APV = E[min(T, L)] / L
LoopValue = E[max(T - L, 0)] / L
```

## Baseline-normalized metric

```text
z_m(v)
=
tanh(
  ln(
    (rate_m(v) + ε)
    /
    (baseline_m[p, niche, length, format, account_band] + ε)
  )
)
```

## Bayesian wave update

```text
q ~ Beta(α0, β0)

q | data ~ Beta(α0 + x, β0 + n - x)
```

Expansion:

```text
P(q > θ_k | data) > c
```

## Exploration

```text
BanditScore(v)
=
EstimatedUtility(v)
+
c · sqrt(log(t) / n_v)
```

## Full reach

```text
Reach_p(v)
=
Σ_k [
  AudiencePool_{p,k}
  · σ(
      (
        α_p · Stop_k
      + β_p · Retention_k
      + γ_p · Intent_k
      + δ_p · TopicFit_k
      + η_p · Relationship_k
      + κ_p · CreatorTrust
      + μ_p · Freshness_k
      + ξ_p · Exploration_k
      - λ_p · NegativeFeedback_k
      - ρ_p · Saturation_k
      - θ_{p,k}
      )
      /
      T_p
    )
  · Eligibility_p(v)
]
```
