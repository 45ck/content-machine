# Expected Utility Math

## Multi-signal reward

Define reward:

```text
R =
w1 · WatchSeconds
+ w2 · Completion
+ w3 · Rewatch
+ w4 · Share
+ w5 · Save
+ w6 · Comment
+ w7 · Follow
+ w8 · ProfileVisit
- w9 · Swipe
- w10 · NotInterested
- w11 · Dislike
- w12 · Report
```

By linearity of expectation:

```text
E[R | x] =
w1 · E[WatchSeconds | x]
+ w2 · P(Completion | x)
+ w3 · P(Rewatch | x)
+ w4 · P(Share | x)
+ w5 · P(Save | x)
+ w6 · P(Comment | x)
+ w7 · P(Follow | x)
+ w8 · P(ProfileVisit | x)
- w9 · P(Swipe | x)
- w10 · P(NotInterested | x)
- w11 · P(Dislike | x)
- w12 · P(Report | x)
```

## Signal family mapping

```text
WatchSeconds, Completion, Rewatch -> Retention Model
Share, Save, Comment, Follow      -> Positive Intent Model
Swipe, NotInterested, Report      -> Negative Risk Model
Topic and user match              -> Audience Fit Model
Historical priors                 -> Creator Baseline Model
Eligibility                       -> Eligibility Gate
Exploration                       -> Bandit Model
Expansion                         -> Bayesian Wave Model
```

## Practical utility formula

```text
PredictedUtility =
α · StopScore
+ β · RetentionScore
+ γ · IntentScore
+ δ · AudienceFit
+ η · CreatorTrust
+ μ · Freshness
+ ξ · Exploration
- λ · NegativeRisk
- ρ · Saturation
```

The score must be calibrated separately per platform.
