# Data Schema

## Core tables

```text
creators
videos
video_assets
video_features
platform_metrics
derived_metrics
signal_scores
experiments
model_predictions
```

## videos

| Field | Type | Notes |
|---|---|---|
| video_id | string | Stable internal ID |
| creator_id | string | Creator/account ID |
| platform | enum | tiktok / instagram / youtube |
| post_time | timestamp | Null if draft |
| duration_sec | float | Video length |
| caption | text | Platform caption |
| hashtags | array<string> | Hashtags |
| sound_id | string | Platform audio/sound ID if known |
| topic_primary | string | Model or manual label |
| format_label | string | Tutorial, story, meme, list, etc. |
| status | enum | draft / posted / archived |

## platform_metrics

Collect at repeated checkpoints:

```text
15m
30m
1h
3h
24h
72h
7d
```

| Field | Type |
|---|---|
| video_id | string |
| checkpoint | string |
| views | int |
| reach | int |
| impressions | int |
| shown_in_feed | int |
| viewed_vs_swiped_rate | float |
| average_watch_seconds | float |
| average_percentage_viewed | float |
| completion_rate | float |
| rewatch_rate | float |
| likes | int |
| comments | int |
| shares | int |
| saves | int |
| follows | int |
| profile_visits | int |
| dislikes | int |
| not_interested | int |
| hides | int |
| reports | int |
| non_follower_reach | int |

## derived_metrics

```text
views_per_follower
non_follower_reach_per_follower
shares_per_reach
saves_per_reach
comments_per_reach
follows_per_reach
completion_lift
retention_lift
share_lift
save_lift
negative_lift
velocity
acceleration
decay_rate
```

## signal_scores

```text
eligibility_score
scroll_stop_score
retention_score
intent_score
shareability_score
saveability_score
audience_fit_score
audience_pool_score
creator_trust_score
relationship_score
freshness_score
saturation_penalty
negative_risk_score
exploration_bonus
tribe_response_score
content_quality_score
pre_publish_vps
live_breakout_score
```
