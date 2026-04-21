# V7 — Confirm / Deny / Refine Validation Pass

V7 separated theories into verdict categories.

## Verdict key

```text
CONFIRMED
= directly supported by official docs or production recommender research.

PARTIALLY CONFIRMED
= mechanism is supported, exact implementation/weight is not public.

INFERRED
= mathematically likely and consistent with public evidence, but not directly confirmed.

WEAK / DENIED
= current evidence does not support it, or supports a weaker version.
```

## Theory validation summary

| Theory | Verdict | Notes |
|---|---|---|
| Eligibility gate exists | Confirmed | Platforms restrict recommendation eligibility and reduce distribution for some content. |
| Eligibility is a pure product formula | Partially confirmed | Gate exists; exact numeric form private. |
| Originality/repost penalty on Instagram | Confirmed directionally | Instagram emphasizes original content and smaller creator distribution. |
| Candidate retrieval before ranking | Confirmed for YouTube, inferred cross-platform | YouTube DNN paper directly supports two-stage architecture. |
| User state is dynamic | Confirmed conceptually | TikTok/YouTube docs describe behavior-based personalization. |
| Video embeddings are multimodal | Partially confirmed | Content metadata confirmed; exact multimodal internals private. |
| Topic clarity as entropy | Inferred | Strong creator-side proxy, not explicitly confirmed. |
| YouTube viewed-vs-swiped hook gate | Confirmed | YouTube exposes this metric for Shorts. |
| First-frame salience is a direct ranking signal | Weak | Better modeled as affecting stop rate. |
| Expected watch time / retention matters | Confirmed strongly | Supported by YouTube paper and platform docs. |
| Duration-debiased watch time | Confirmed in research, inferred for major platforms | Kuaishou D2Q supports duration bias correction. |
| Raw views are main signal | Denied | Views are exposure; engaged views/retention are stronger. |
| Strong intent > likes | Partially confirmed | Exact hierarchy not public, but multi-signal engagement confirmed. |
| Instagram sends/saves dominate likes | Partially confirmed | Sends/saves are real signals; dominance is a testable hypothesis. |
| TikTok favorites/shares/comments > likes | Partially confirmed | Exact ordering not public. |
| Negative feedback matters | Confirmed | TikTok and YouTube mention skip/not-interested/hide/report/dislike feedback. |
| One negative action kills a video | Denied | Negative feedback is a signal, not a deterministic blocker. |
| Exploration exists | Confirmed directionally | TikTok mentions diversity and content outside expressed interests. |
| Feed diversity/fatigue exists | Confirmed for TikTok | TikTok says it avoids repetitive patterns such as same sound/creator in sequence. |
| Expansion waves | Partially confirmed | Instagram Trial Reels strongly supports test-before-broader-distribution logic. |
| Plateaus always mean shadowban | Denied | Plateaus can mean failed expansion, eligibility cap, weak routing, saturation, or audience exhaustion. |
| Real-time learning | Confirmed in recommender research | ByteDance Monolith supports real-time short-video recommendation. |
| Recommendation is sequence prediction | Confirmed directionally by modern research | Meta HSTU supports sequence-based recommendation. |
| Saturation/competition affects reach | Confirmed conceptually | YouTube docs acknowledge topic interest, competition, seasonality, and shifting viewer behavior. |
| Post time determines long-term YouTube reach | Weak / mostly denied | YouTube says publish time may affect immediate views but not observed long-term viewership. |
| Follower count directly boosts TikTok FYP | Denied | TikTok says follower count is not a direct For You factor. |
| Hashtags/sounds determine reach | Partially confirmed but often overvalued | They help routing; behavior drives expansion. |

## Refined platform models

### TikTok

```text
TikTokBreakout =
σ(
  β1 · Retention × TopicFit
+ β2 · Stop × Retention
+ β3 · Share/Favorite/Comment
+ β4 · Exploration
+ β5 · TrendVelocity
- β6 · NegativeFeedback
- β7 · EligibilityRisk
)
```

Confidence:

```text
Signal classes: high
Interaction structure: medium
Exact coefficients: low
```

### Instagram Reels

```text
IG_ReelsBreakout =
σ(
  β1 · Retention × SendRate
+ β2 · SaveRate × TopicClarity
+ β3 · Originality
+ β4 · FollowRate
+ β5 · Relationship/CreatorTrust
- β6 · NegativeFeedback
- β7 · RepostPenalty
)
```

Confidence:

```text
Watch/saves/reshares/comments: high
Sends dominate likes: medium
Originality gate: medium-high
Exact coefficients: low
```

### YouTube Shorts

```text
YTShortsBreakout =
σ(
  β1 · ViewedVsSwiped × AveragePercentageViewed
+ β2 · Retention × SessionFit
+ β3 · SubscribeRate
+ β4 · LongTermSatisfaction
+ β5 · RemixPotential
- β6 · NegativeFeedback
)
```

Confidence:

```text
Viewed-vs-swiped: high
APV / retention: high
Session fit: medium-high
Exact coefficients: low
```

## Corrected master formula

```text
Reach_p(v) =
Eligibility_p(v)
· Σ_g Σ_k AudienceSize_{p,g,k}
· Π_{j=0}^{k}
Φ(
  (μ_{p,v,g,j} - θ_{p,g,j,t}) /
  sqrt(σ²_{p,v,g,j} + τ²_p)
)
```

with:

```text
μ = βᵀx + xᵀQx + MLP_residual(x)
```

and:

```text
x = [
  StopScore,
  DurationDebiasedRetention,
  Completion,
  Rewatch/Loop,
  ShareSend,
  SaveFavorite,
  Comment,
  FollowSubscribe,
  TopicFit,
  TopicClarity,
  Relationship,
  Originality,
  CreatorTrust,
  Exploration,
  Freshness,
  NegativeFeedback,
  CompetitionPressure
]
```
