# V3 — Grey-Box Recommender Architecture

## System stack

A realistic short-form recommender is modeled as:

```text
Eligible content pool
→ candidate generation
→ ranking model
→ diversity / safety / fatigue reranking
→ small audience test
→ expansion or decay
→ real-time feedback update
```

## True hidden object

The system estimates:

```text
Utility_p(u,v,s,t) = E[viewer satisfaction | user, video, creator, session, time]
```

Expanded:

```text
Utility_p =
Σ_i α_i · P(positive_action_i)
+ Σ_j β_j · E(continuous_value_j)
- Σ_k λ_k · P(negative_action_k)
```

Positive actions:

```text
stop_scroll
watch_3s
complete
rewatch
like
comment
share
save
follow
profile_visit
subscribe
remix
```

Continuous outcomes:

```text
watch_seconds
watch_percentage
session_extension
return_probability
long_term_satisfaction
```

Negative actions:

```text
quick_swipe
not_interested
hide
report
dislike
unfollow
don't_recommend_channel
```

## User embedding

```text
e_u(t) =
LayerNorm(
  Σ_i exp(-(t - τ_i) / d_{a_i})
  · strength(a_i)
  · W_{a_i}
  · e_{v_i}
)
```

Action-strength prior:

```text
share/send        = +3.0
save/favorite     = +2.7
full watch        = +2.4
rewatch           = +2.2
comment           = +1.8
like              = +1.2
profile visit     = +1.1
follow/subscribe  = +1.6
quick swipe       = -1.5
not interested    = -3.0
hide              = -3.5
report            = -5.0
```

## Video embedding

```text
e_v =
W_text · TextEmbed(caption + transcript + OCR)
+ W_visual · VisualEmbed(frames)
+ W_audio · AudioEmbed(sound + music + voice)
+ W_meta · MetaEmbed(length + hashtags + format + language)
+ W_creator · CreatorEmbed(c)
+ W_perf · EarlyPerformanceEmbed(v)
```

## Candidate retrieval

```text
CandidateSet_p(u) =
C_interest
∪ C_cowatch
∪ C_creator
∪ C_social
∪ C_trend
∪ C_fresh
∪ C_explore
```

Retrieval score:

```text
RetrieveScore(u,v) =
0.30 · cosine(e_u, e_v)
+ 0.22 · CoWatchPMI(u,v)
+ 0.14 · CreatorAffinity(u,c)
+ 0.10 · TrendVelocity(v,t)
+ 0.08 · SocialGraphSignal(u,v)
+ 0.08 · Freshness(v,t)
+ 0.08 · ExplorationValue(v)
```

Co-watch signal:

```text
CoWatchPMI(a,b) =
log(P(user watches a and b) / (P(user watches a) · P(user watches b)))
```

## Retention survival curve

Let:

```text
T = watch duration
L = video length
S(τ) = P(T ≥ τ)
```

Then:

```text
ExpectedWatchSeconds = ∫_0^L S(τ)dτ
AveragePercentageViewed = ExpectedWatchSeconds / L
CompletionProbability = S(L)
LoopProbability = P(T > L)
```

## Deep utility approximation

```text
x = [StopScore, RetentionScore, IntentScore, TopicFit, RelationshipScore, CreatorTrust, FreshnessVelocity, ExplorationValue, NegativeFeedback, SaturationPenalty]
```

```text
Utility_p(u,v) = β_pᵀx + xᵀQ_p x + MLP_residual_p(x)
```

Important interaction terms:

```text
Retention × TopicFit
WatchTime × ShareRate
StopRate × CompletionRate
SaveRate × TopicClarity
NegativeFeedback × AudienceScale
Originality × Eligibility
```

## Platform-specific grey-box laws

```text
TikTok ≈ Retention × TopicFit × ExplorationConfidence
Instagram Reels ≈ WatchTime × SendsPerReach × Saves × Originality
YouTube Shorts ≈ ViewedVsSwiped × APV × SessionContinuation × Satisfaction
```
