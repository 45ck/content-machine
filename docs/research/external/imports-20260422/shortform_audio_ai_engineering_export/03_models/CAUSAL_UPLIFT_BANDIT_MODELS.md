# **Causal, Uplift, and Bandit Models**

## **1. Causal intervention**

The target is:

```math
E[Y | do(A = a_1)] - E[Y | do(A = a_0)]
```

This asks what changes when audio is changed while other factors are held constant.

## **2. Controlled variant testing**

Use matched variants:

```text
same visual base
same caption family
same creator
same topic
same post-time window
same duration
different audio only
```

Estimate:

```math
Y_i = α + τ_j AudioVariant_{ij} + β₁Duration_i + β₂Topic_i + β₃PostHour_i + β₄CreatorBaseline_i + β₅TrendState_i + ε_i
```

`τ_j` is the estimated audio treatment effect.

## **3. Uplift model**

```math
Uplift(a) = E[Y | X, A=a] - E[Y | X, A=baseline]
```

Train:

```math
μ_1(X) = E[Y | X, A=a]
μ_0(X) = E[Y | X, A=baseline]
```

Then:

```math
Uplift_hat(X,a) = μ̂_1(X) - μ̂_0(X)
```

## **4. Thompson sampling**

Each audio strategy is an arm:

```text
voice
trend
music
foley
comedy
brand
```

Model:

```math
θ_s ~ Beta(α_s, β_s)
```

Reward:

```math
r_i = 1(AudioLift_i > 0)
```

Update:

```math
α_s ← α_s + r_i
β_s ← β_s + (1-r_i)
```

Select:

```math
s* = argmax_s Sample(Beta(α_s, β_s))
```

## **5. Contextual bandit**

Context:

```text
Topic, Format, Duration, Audience, Platform, Objective
```

Decision:

```math
s* = argmax_s [r̂_{i,s} + ExplorationBonus_{i,s}]
```

## **6. Active learning**

```math
SelectionScore(A_j) = Reward_hat(A_j) + κ Uncertainty(A_j) - λ Risk(A_j)
```

This makes the system test uncertain but safe audio variants.
