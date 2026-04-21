# V5 — Hypothesis Ensemble

V5 stopped treating the algorithm as one fixed formula. Instead, it treated the system as a set of competing hypotheses that can be ranked, tested, and updated.

## Hypothesis scoring criteria

Each hypothesis receives a `0–5` score on:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
```

Composite:

```text
HypothesisScore = 0.30E + 0.20M + 0.15O + 0.25P + 0.10F
```

Interpretation:

```text
4.5–5.0 = core model
4.0–4.4 = strong hypothesis
3.5–3.9 = useful but uncertain
3.0–3.4 = secondary
<3.0    = weak unless future data supports it
```

## Major subsystems

```text
A. Eligibility gate
B. Candidate retrieval
C. User state model
D. Video representation and topic clarity
E. Stop-scroll / hook
F. Retention and watch-time
G. Engagement intent
H. Negative feedback
I. Ranking objective
J. Exploration
K. Expansion waves
L. Real-time learning
M. Saturation and competition
```

## Top-ranked hypotheses

| Rank | Hypothesis | Score | Status |
|---:|---|---:|---|
| 1 | Expected utility ranking | 5.0 | Core |
| 2 | Two-stage candidate generation + ranking | 4.9 | Core |
| 3 | Expected watch time / retention objective | 4.9 | Core |
| 4 | YouTube Shorts viewed-vs-swiped entry gate | 4.9 | Core for Shorts |
| 5 | Duration-debiased watch-time scoring | 4.8 | Core |
| 6 | Posterior probability expansion waves | 4.8 | Core |
| 7 | User embedding updated by actions | 4.8 | Core |
| 8 | Negative feedback asymmetric penalty | 4.8 | Core |
| 9 | Eligibility as multiplicative gate | 4.7 | Core |
| 10 | Strong intent > weak intent | 4.7 | Core |
| 11 | Sequential wave distribution | 4.7 | Core |
| 12 | Real-time user/video updates | 4.7 | Core |
| 13 | Nonlinear interaction model | 4.6 | Strong |
| 14 | Topic clarity as routing confidence | 4.3 | Strong |
| 15 | Competition pressure raises threshold | 4.3 | Strong |
| 16 | Instagram sends/saves > likes for unconnected reach | 4.0 | Test |
| 17 | Creator trust slow-moving account prior | 4.0 | Test |
| 18 | Trend decay curve | 3.9 | Secondary |
| 19 | First-frame salience model | 3.7 | Secondary |

## Layered model plan

### Layer 1 — creator-observable model

```text
BreakoutProbability =
σ(
  β0
+ β1 StopScore
+ β2 RetentionScore
+ β3 DurationDebiasedWatch
+ β4 ShareSaveScore
+ β5 CommentFollowScore
+ β6 TopicClarity
- β7 NegativeFeedback
)
```

### Layer 2 — platform-specific interaction model

TikTok:

```text
P_breakout =
σ(β0 + β1 Retention·TopicFit + β2 Stop·Retention + β3 ShareFavorite - β4 NegativeFeedback)
```

Instagram:

```text
P_breakout =
σ(β0 + β1 Retention·SendRate + β2 SaveRate·TopicClarity + β3 Originality - β4 NegativeFeedback)
```

YouTube Shorts:

```text
P_breakout =
σ(β0 + β1 ViewedVsSwiped·APV + β2 Retention·SessionFit + β3 SubscribeRate - β4 NegativeFeedback)
```

### Layer 3 — wave model

```text
P_expand_k = Φ((Quality_k - Threshold_k) / Uncertainty_k)
```

with:

```text
Threshold_k = Base + AudienceDistance + CompetitionPressure - TrendBoost
```

## V5 conclusion

```text
Short-form reach is not a reward for engagement.
It is a sequence of statistically controlled expansion decisions.
```
