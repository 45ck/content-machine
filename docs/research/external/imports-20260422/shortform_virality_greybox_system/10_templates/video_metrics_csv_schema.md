# Video Metrics CSV Schema

```csv
video_id,creator_id,platform,post_time,duration_sec,caption,hashtags,sound_id,topic_primary,format_label,follower_count_at_post,checkpoint,views,reach,impressions,shown_in_feed,viewed_vs_swiped_rate,average_watch_seconds,average_percentage_viewed,completion_rate,rewatch_rate,likes,comments,shares,saves,follows,profile_visits,dislikes,not_interested,hides,reports,non_follower_reach
```

## Required checkpoints

```text
15m
30m
1h
3h
24h
72h
7d
```

## Required derived columns

```text
shares_per_reach
saves_per_reach
comments_per_reach
follows_per_reach
views_per_follower
non_follower_reach_per_follower
retention_lift
share_lift
save_lift
negative_lift
velocity
acceleration
```
