# V4 — Calibrated Stochastic Model

V4 corrected the previous hand-weighted formulas by introducing empirical-Bayes evidence, duration-debiased watch scores, topic clarity, nonlinear interactions, and posterior expansion.

## Empirical-Bayes metric evidence

For metric `m`:

```text
x_m ~ Binomial(n_m, p_m)
```

Baseline prior:

```text
p_m ~ Beta(ν_m · b_m, ν_m · (1 - b_m))
```

where:

```text
b_m = baseline rate for platform + niche + length + format + account band
ν_m = prior strength
```

Posterior rate:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

Log-odds evidence over baseline:

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

Uncertainty:

```text
SE_m ≈ sqrt(
  1 / (x_m + ν_m b_m)
  + 1 / (n_m - x_m + ν_m(1 - b_m))
)
```

Final metric signal:

```text
Signal_m = Evidence_m - ζ · SE_m
```

This prevents over-trusting tiny samples like:

```text
3 shares / 20 views
```

## Duration-debiased watch score

Raw watch seconds are biased by video length. Use a duration-conditioned CDF:

```text
F_{p,niche,L}(w) = P(W ≤ w | platform, niche, video_length_bucket)
```

Then:

```text
WatchQuantileScore = Φ^{-1}(F_{p,niche,L}(ObservedWatchTime))
```

This asks:

```text
How exceptional was this watch time for this type of video?
```

## Topic clarity

Topic fit answers:

```text
Is this video relevant to this user?
```

Topic clarity answers:

```text
Does the system know who this video is for?
```

Topic distribution:

```text
TopicVector(v) = softmax(W_topic · e_v)
```

Topic clarity:

```text
TopicClarity(v) = 1 - H(TopicDistribution(v)) / log(K)
```

High clarity:

```text
fitness:       0.78
productivity: 0.08
lifestyle:    0.06
humor:        0.04
other:        0.04
```

Low clarity:

```text
fitness:       0.21
productivity: 0.18
lifestyle:    0.17
humor:        0.16
other:        0.28
```

## Posterior expansion

Instead of:

```text
if Score > threshold: expand
```

use:

```text
expand if P(Quality > Threshold | observed data) is high enough
```

Approximation:

```text
P_expand(k,g) =
Φ((μ_{k,g} - θ_{p,k,g}) / sqrt(σ²_{k,g} + τ²_p))
```

Threshold:

```text
θ_{p,k,g} =
θ_{p,0}
+ a_p · log(1+k)
+ b_p · AudienceDistance(g)
+ c_p · CompetitionPressure(topic,t)
- d_p · TrendBoost(v,t)
```

Expected reach:

```text
ExpectedReach_p(v) =
Eligibility_p(v)
· Σ_{k,g} [AudienceSize_{k,g} · Π_{j=0}^{k} P_expand(j,g)]
```

## Improved platform priors

### TikTok

```text
TikTokBreakout =
σ(
  1.35 · Retention · TopicFit
+ 0.90 · Stop · Retention
+ 0.70 · ShareFavorite · TopicClarity
+ 0.45 · CommentVelocity
+ 0.35 · TrendVelocity
+ 0.30 · Exploration
- 1.20 · NegativeFeedback
- 0.45 · Saturation
)
```

### Instagram Reels

```text
IGBreakout =
σ(
  1.25 · Retention · SendShare
+ 0.85 · Save · TopicClarity
+ 0.55 · Stop · Retention
+ 0.45 · Originality · CreatorTrust
+ 0.30 · FollowRate
- 1.20 · NegativeFeedback
- 0.65 · RepostPenalty
)
```

### YouTube Shorts

```text
YTShortsBreakout =
σ(
  1.30 · ViewedVsSwiped · AveragePercentageViewed
+ 0.85 · Retention · SessionFit
+ 0.55 · SubscribeRate
+ 0.45 · LongTermSatisfaction
+ 0.25 · RemixPotential
- 1.15 · NegativeFeedback
)
```

## V4 improvement over previous models

```text
posterior uncertainty
+ duration debiasing
+ topic clarity
+ nonlinear interactions
+ audience-cluster expansion
+ platform-specific priors
```
