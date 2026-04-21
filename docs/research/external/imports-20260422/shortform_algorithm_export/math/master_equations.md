# Master Equations

## 1. Expected utility ranking

For user `u`, video `v`, session `s`, platform `p`, and time `t`:

```text
U_p(u,v,s,t)
=
Σ_i α_{p,i} · P(positive_action_i | x)
+ Σ_j β_{p,j} · E(continuous_value_j | x)
- Σ_k λ_{p,k} · P(negative_action_k | x)
```

Final ranking:

```text
Rank_p(u,v,s,t)
=
Eligibility_p(v,c)
· Rerank_p(U_p, Diversity, Fatigue, Exploration)
```

## 2. Optimal ranking proof sketch

Let each video have expected utility `q_i` and slots have exposure weights:

```text
π_1 ≥ π_2 ≥ ... ≥ π_n
```

A ranking `σ` has value:

```text
U(σ) = Σ_r π_r · q_{σ(r)}
```

If lower-utility item `i` is above higher-utility item `j`:

```text
q_i < q_j
```

and slot `a` is above slot `b`:

```text
π_a ≥ π_b
```

Swapping them changes value by:

```text
U_new - U_old = (π_a - π_b)(q_j - q_i) ≥ 0
```

So ranking by descending expected utility is optimal under this exposure model.

## 3. Retention survival curve

Let:

```text
T = watch duration
L = video length
S(t) = P(T ≥ t)
```

Expected watch seconds:

```text
E[min(T,L)] = ∫_0^L S(t)dt
```

Average percentage viewed:

```text
APV = E[min(T,L)] / L
```

Completion:

```text
CompletionRate = S(L)
```

Loop value:

```text
LoopValue = E[max(T - L, 0)] / L
```

## 4. Baseline normalization

Simple log-ratio version:

```text
Z_m = tanh(ln((rate_m + ε) / (baseline_m + ε)))
```

Empirical-Bayes version:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

```text
EB_m = Evidence_m - ζ · SE_m
```

## 5. Duration-debiased watch score

```text
WatchQuantileScore = Φ^{-1}(F_{p,niche,L}(ObservedWatchTime))
```

where:

```text
F_{p,niche,L} = watch-time CDF for similar videos
```

## 6. Topic clarity

```text
TopicClarity(v) = 1 - H(TopicDistribution(v)) / log(K)
```

Alternative operational proxy:

```text
TopicClarity ≈ max_topic_probability - mean(other_topic_probabilities)
```

## 7. Posterior expansion probability

```text
P_expand(p,v,g,k,t) =
Φ(
  (μ_{p,v,g,k} - θ_{p,g,k,t}) /
  sqrt(σ²_{p,v,g,k} + τ²_p)
)
```

## 8. Threshold model

```text
θ_{p,g,k,t} =
θ_0
+ a · log(1+k)
+ b · AudienceDistance(g)
+ c · CompetitionPressure(topic,t)
- d · TrendBoost(v,t)
```

## 9. Expected reach

```text
ExpectedReach_p(v) =
Eligibility_p(v)
· Σ_g Σ_k
AudienceSize_{p,g,k}
· Π_{j=0}^{k} P_expand(p,v,g,j,t)
```

## 10. Nonlinear utility model

```text
μ_{p,v,g,k} = βᵀx + xᵀQx + MLP_residual(x)
```

Important interactions:

```text
Retention × TopicFit
Stop × Retention
WatchTime × ShareSend
Save × TopicClarity
ViewedVsSwiped × APV
Originality × CreatorTrust
NegativeFeedback × AudienceScale
```

## 11. Hypothesis weight update

```text
w_i(t+1) =
w_i(t) · exp(-η · Loss_i)
/
Σ_j w_j(t) · exp(-η · Loss_j)
```

Final prediction:

```text
FinalPrediction(v) = Σ_i w_i · ŷ_i(v)
```
