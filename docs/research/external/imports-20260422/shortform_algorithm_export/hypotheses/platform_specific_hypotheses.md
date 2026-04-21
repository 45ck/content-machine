# Platform-Specific Hypotheses

## TikTok

### Best current formula

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

### Ranked TikTok hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | User interactions dominate weak context signals | Confirmed | High |
| 2 | Retention × TopicFit drives FYP expansion | Partially confirmed / inferred interaction | Medium-high |
| 3 | Full watch / watch time matters more than likes | Confirmed directionally | High |
| 4 | Favorites/shares/comments are stronger than likes | Partially confirmed | Medium |
| 5 | Exploration is strong because TikTok is interest-graph driven | Confirmed directionally | Medium-high |
| 6 | Trend velocity can temporarily reduce thresholds | Inferred | Medium |
| 7 | Follower count is indirect, not direct | Confirmed denial of direct factor | High |

### Model notes

```text
TikTok = interest graph + retention + exploration.
Follower count can help indirectly through initial audience and historical data, but not as a direct For You ranking factor.
```

---

## Instagram Reels

### Best current formula

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

### Ranked Instagram hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | Watch time × sends drives unconnected reach | Partially confirmed / test | Medium |
| 2 | Saves indicate durable value | Confirmed as signal, weight unknown | Medium-high |
| 3 | Originality affects eligibility / expansion | Confirmed directionally | Medium-high |
| 4 | Relationship signals matter more than TikTok | Inferred / platform-consistent | Medium |
| 5 | Trial/non-follower testing reflects expansion waves | Confirmed for Trial Reels | High |
| 6 | Likes matter less than sends/saves for discovery | Test | Medium |
| 7 | Repost/watermark behavior suppresses distribution | Confirmed directionally | Medium |

### Model notes

```text
Instagram = interest graph + social graph + originality + non-follower tests.
```

---

## YouTube Shorts

### Best current formula

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

### Ranked YouTube Shorts hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | Viewed-vs-swiped is the entry gate | Confirmed | High |
| 2 | APV and duration-debiased watch beat raw views | Confirmed directionally | High |
| 3 | Session continuation matters more than TikTok | Partially confirmed / inferred | Medium-high |
| 4 | Subscribe rate is stronger than like rate | Test | Medium |
| 5 | Satisfaction protects against watch-time gaming | Confirmed conceptually | High |
| 6 | Remixes indicate trend potential | Secondary | Medium-low |
| 7 | Negative feedback reduces future recommendations | Confirmed | High |

### Model notes

```text
YouTube Shorts = viewed-vs-swiped × average percentage viewed × session fit × satisfaction.
```
