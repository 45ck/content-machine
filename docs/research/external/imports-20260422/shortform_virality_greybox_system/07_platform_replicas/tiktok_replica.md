# TikTok Grey-Box Replica

## Supported signal classes

TikTok publicly states recommendation inputs include user interactions, content information, and user information. Examples include likes, shares, comments, watching in full, skipping, sounds, hashtags, video views, country, language, location, time zone, day, and device type.

## Most defensible equation

```text
TikTokScore =
σ(
  1.35·Retention·TopicFit
+ 1.10·StopScore
+ 0.85·ShareCommentIntent
+ 0.60·TrendSoundFit
+ 0.45·Exploration
- 1.25·SkipRisk
- 0.85·NotInterestedRisk
- 0.55·Saturation
)
× Eligibility
```

## Important submodels

```text
Scroll-stop
Retention
Topic/audience fit
Trend/sound fit
Negative feedback risk
Expansion wave
Exploration bonus
```

## Primary data to collect

```text
views
watch time
completion
rewatch
shares
comments
likes
follows
profile visits
not interested / skip proxies
sound/hashtag usage
non-follower reach if available
```

## Validation

```text
Retention + TopicFit + ShareCommentIntent
should predict future non-follower reach better than likes alone.
```
