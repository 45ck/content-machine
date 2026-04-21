# V2 — Short-Form Core Algorithm

## Variables

For short-form video `v`:

```text
I  = impressions / shown in feed
V  = views
S  = swipes / quick skips
W  = total watch seconds
L  = video length in seconds
C  = completed views
R  = rewatches / loops
K  = likes
M  = comments
H  = shares / sends
F  = saves / favorites
G  = follows / subscribers gained
P  = profile visits
N  = negative actions
```

Rates:

```text
ViewRate        = V / I
SwipeRate       = S / I
AvgWatchRatio   = (W / V) / L
CompletionRate  = C / V
RewatchRate     = R / V
LikeRate        = K / V
CommentRate     = M / V
ShareRate       = H / V
SaveRate        = F / V
FollowRate      = G / V
ProfileTapRate  = P / V
NegativeRate    = N / I
```

## Hook score

```text
HookScore =
0.45 · Z(ViewRate)
+ 0.35 · Z(1 - SwipeRate)
+ 0.20 · Z(First3SecondHold)
```

For YouTube Shorts, replace the first term with viewed-vs-swiped:

```text
YouTubeHook =
0.60 · Z(ViewedVsSwipedAway)
+ 0.25 · Z(First3SecondHold)
+ 0.15 · Z(ViewRate)
```

## Retention score

```text
RetentionScore =
0.30 · Z(AvgWatchRatio)
+ 0.30 · Z(CompletionRate)
+ 0.25 · Z(RewatchRate)
+ 0.15 · Z(ViewRate)
```

Short video variant:

```text
RetentionScore_short =
0.25 · Z(AvgWatchRatio)
+ 0.40 · Z(CompletionRate)
+ 0.25 · Z(RewatchRate)
+ 0.10 · Z(ViewRate)
```

Longer short-form variant:

```text
RetentionScore_long =
0.40 · Z(AvgWatchRatio)
+ 0.25 · Z(CompletionRate)
+ 0.20 · Z(RewatchRate)
+ 0.15 · Z(ViewRate)
```

## Engagement / intent score

```text
EngagementScore =
0.18 · Z(LikeRate)
+ 0.22 · Z(CommentRate)
+ 0.32 · Z(ShareRate)
+ 0.20 · Z(SaveRate)
+ 0.08 · Z(FollowRate)
```

## Negative feedback penalty

```text
PenaltyScore =
0.35 · Z(SwipeRate)
+ 0.25 · Z(NegativeRate)
+ 0.20 · Z(ReportRate)
+ 0.10 · Z(UnfollowRate)
+ 0.10 · Z(LowQualitySignals)
```

## Generic short-form ranking model

```text
RankScore_p(u,v,t) =
w1_p · HookScore
+ w2_p · RetentionScore
+ w3_p · EngagementScore
+ w4_p · TopicMatch(u,v)
+ w5_p · RelationshipScore(u,creator)
+ w6_p · CreatorHealth
+ w7_p · FreshnessVelocity
- w8_p · PenaltyScore
+ ExplorationBonus
```

## Platform-specific priors

### TikTok FYP

```text
TikTokScore =
0.20 · HookScore
+ 0.35 · RetentionScore
+ 0.18 · EngagementScore
+ 0.17 · TopicMatch
+ 0.04 · CreatorHealth
+ 0.03 · FreshnessVelocity
+ 0.03 · ExplorationBonus
- 0.20 · PenaltyScore
```

### Instagram Reels

```text
InstagramReelsScore =
0.18 · HookScore
+ 0.28 · RetentionScore
+ 0.26 · ShareSaveScore
+ 0.12 · LikeCommentScore
+ 0.08 · TopicMatch
+ 0.04 · RelationshipScore
+ 0.04 · CreatorHealth
- 0.20 · PenaltyScore
```

### YouTube Shorts

```text
YouTubeShortsScore =
0.30 · HookScore
+ 0.32 · RetentionScore
+ 0.14 · EngagementScore
+ 0.12 · TopicSessionMatch
+ 0.06 · ChannelHealth
+ 0.04 · FreshnessVelocity
+ 0.02 · RemixPotential
- 0.18 · PenaltyScore
```

## Expansion model

```text
P_expand_k = 1 / (1 + e^(-(CohortScore_k - θ_k) / s))
```

Final reach:

```text
FinalReach(v) = Σ_k [AudiencePool_k · σ((Score_k - θ_k) / s) · Eligibility(v)]
```

## Limitation

V2 still used hand-chosen weights. The next improvement was to model the system as a recommender architecture with candidate retrieval, embeddings, uncertainty, and posterior wave expansion.
