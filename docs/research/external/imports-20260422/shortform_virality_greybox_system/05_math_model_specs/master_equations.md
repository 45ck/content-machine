# Master Equations

## Full reach model

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
      / T_p
    )
  · Eligibility_p(v)
]
```

## Pre-publish score

```text
VPS-P =
100 × σ(
  1.30·ScrollStop
+ 1.40·Retention
+ 1.25·Shareability
+ 1.05·Saveability
+ 0.95·AudienceFit
+ 0.80·ContentQuality
+ 0.75·CreatorTrust
+ 0.65·Freshness
+ 0.50·TRIBE
- 1.45·NegativeRisk
- 0.90·Saturation
- 1.20·EligibilityPenalty
)
```

These are prototype priors, not claimed platform coefficients.

## Live breakout score

```text
VPS-L(t) =
100 × σ(
  0.45·VPS-P
+ 1.35·ObservedStopLift_t
+ 1.45·ObservedRetentionLift_t
+ 1.55·ObservedShareSaveLift_t
+ 1.00·Velocity_t
+ 0.80·Acceleration_t
+ 0.75·CohortQuality_t
- 1.50·ObservedNegativeLift_t
- 0.85·Decay_t
)
```

## Expected utility

```text
Utility(u,v)
=
Σ positive_outcomes w_i · P_i(u,v)
+
Σ continuous_outcomes β_j · E_j(u,v)
-
Σ negative_outcomes λ_k · P_k(u,v)
```

Rank by:

```text
rank(v) = descending Utility(u,v)
```

## Expansion

```text
P_expand_k =
P(QualityScore_k > θ_k | observed_wave_data)
```

## Final target

```text
P(top_decile_normalized_performance)
```
