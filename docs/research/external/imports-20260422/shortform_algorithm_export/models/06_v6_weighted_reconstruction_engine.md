# V6 — Hypothesis-Weighted Reconstruction Engine

V6 formalized the idea that the model should update as evidence accumulates.

## Evidence-weighted hypothesis score

Each hypothesis gets scored on:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
T = platform transferability
```

Composite:

```text
HypothesisScore =
0.25E + 0.20M + 0.15O + 0.20P + 0.10F + 0.10T
```

## Master model

```text
ExpectedReach_p(v) =
Eligibility_p(v,c)
· Σ_g Σ_k [
  AudienceSize_{p,g,k}
  · Π_{j=0}^{k} P_expand(p,v,g,j,t)
]
```

where:

```text
P_expand(p,v,g,k,t) =
Φ((μ_{p,v,g,k} - θ_{p,g,k,t}) / sqrt(σ²_{p,v,g,k} + τ²_p))
```

and:

```text
μ_{p,v,g,k} = β_pᵀx_{v,g,k} + x_{v,g,k}ᵀQ_p x_{v,g,k} + MLP_p(x_{v,g,k})
```

## Hypothesis-weight update

Each hypothesis `H_i` creates a prediction:

```text
ŷ_i(v) = prediction from hypothesis i for video v
```

Observed outcome:

```text
y(v) = log(1 + reach_72h)
```

Loss:

```text
Loss_i = (y - ŷ_i)^2
```

Update:

```text
w_i(t+1) =
w_i(t) · exp(-η · Loss_i)
/
Σ_j w_j(t) · exp(-η · Loss_j)
```

Final ensemble prediction:

```text
FinalPrediction(v) = Σ_i w_i · ŷ_i(v)
```

## Empirical-Bayes metric engine

For each metric `m`:

```text
x_m = observed events
n_m = opportunities
b_m = baseline rate
ν_m = prior strength
```

Posterior:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

Evidence:

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

Uncertainty-adjusted evidence:

```text
EB_m = Evidence_m - ζ · SE_m
```

## Creator-observable approximation

```text
BreakoutProbability_p(v) =
σ(
  β_0
+ β_1 · EB_Stop
+ β_2 · EB_Retention
+ β_3 · EB_DurationDebiasedWatch
+ β_4 · EB_ShareSave
+ β_5 · EB_Comment
+ β_6 · EB_Follow
+ β_7 · TopicClarity
+ β_8 · FreshnessVelocity
+ β_9 · Retention × ShareSave
+ β_10 · Retention × TopicClarity
- β_11 · EB_NegativeFeedback
- β_12 · SaturationProxy
)
```

## Key V6 thesis

```text
Do not pick one theory upfront.
Let hypotheses compete using actual post-level analytics.
```
