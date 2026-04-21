# V1 — Multi-Platform Ranking Algorithm

## Core idea

The first model treated each platform as a ranker that estimates how valuable a post is for a specific viewer.

For platform `p`, viewer `u`, creator/account `a`, content `c`, and time `t`:

```text
RankScore_p(u,c,t)
=
wA_p · Attention(c,t)
+ wS_p · ShareSend(c,t)
+ wI_p · Interaction(c,t)
+ wT_p · TopicMatch(u,c)
+ wR_p · Relationship(u,a)
+ wV_p · FreshnessVelocity(c,t)
+ wH_p · CreatorHealth(a,c)
- Penalty_p(u,c,a,t)
+ Exploration_p(u,c)
```

## Baseline normalization

Raw likes/views are weak. Compare each metric against the expected baseline for:

```text
platform + content format + niche + video length + account size band
```

Metric normalization:

```text
Z_m = tanh( ln((rate_m + ε) / (baseline_m + ε)) )
```

where:

```text
rate_m = observed metric rate
baseline_m = median/expected rate for similar content
ε = small constant, e.g. 0.0001
```

## Signal blocks

### Attention

```text
Attention =
0.30 · Z_3sHold
+ 0.30 · Z_CompletionRate
+ 0.25 · Z_AvgWatchRatio
+ 0.15 · Z_RewatchRate
- 0.20 · Z_EarlySkipRate
```

### Share / send

```text
ShareSend =
0.55 · Z_DMShareRate
+ 0.25 · Z_PublicShareRate
+ 0.20 · Z_CopyLinkOrExternalShareRate
```

### Interaction

```text
Interaction =
0.30 · Z_LikeRate
+ 0.25 · Z_CommentRate
+ 0.20 · Z_SaveOrFavoriteRate
+ 0.15 · Z_FollowRate
+ 0.10 · Z_ProfileTapRate
```

### Topic match

```text
TopicMatch(u,c) =
0.60 · cosine(UserInterestVector_u, ContentTopicVector_c)
+ 0.20 · SearchKeywordMatch(c)
+ 0.10 · AudioSoundClusterMatch(c)
+ 0.10 · GeoLanguageFit(u,c)
```

### Relationship

```text
Relationship(u,a) =
0.30 · Z_DMHistory
+ 0.25 · Z_CommentHistory
+ 0.20 · Z_ProfileVisitHistory
+ 0.15 · Z_PastSharesBetweenUsers
+ 0.10 · Z_CloseGraphSignal
```

## Platform weight priors

| Platform surface | Attention | Shares/Sends | Interaction | Topic Match | Relationship | Freshness | Creator Health |
|---|---:|---:|---:|---:|---:|---:|---:|
| TikTok FYP | 0.42 | 0.14 | 0.16 | 0.18 | 0.02 | 0.04 | 0.04 |
| Instagram Reels / Explore | 0.30 | 0.22 | 0.16 | 0.16 | 0.04 | 0.06 | 0.06 |
| Instagram Feed | 0.18 | 0.15 | 0.22 | 0.12 | 0.20 | 0.08 | 0.05 |
| Instagram Stories | 0.15 | 0.12 | 0.15 | 0.03 | 0.40 | 0.10 | 0.05 |

## Expansion model

For wave `k`:

```text
CohortScore_p,k = mean RankScore over viewers in test cohort k
```

Expansion probability:

```text
P_expand_p,k = sigmoid((CohortScore_p,k - θ_p,k) / τ_p)
```

Next reach:

```text
NextReach_p,k+1 = AvailableAudience_p,k+1 · P_expand_p,k · Eligibility(c)
```

## Limitation

V1 was directionally useful, but too simple. It treated the system as a weighted score rather than a stochastic recommender with uncertainty, candidate retrieval, user embeddings, and audience-wave testing.
