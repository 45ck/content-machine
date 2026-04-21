# Data Dictionary

## Core metrics

| Metric | Meaning |
|---|---|
| views | Platform-counted views |
| reach | Unique accounts/users reached |
| impressions | Total exposures |
| shown_in_feed | Shorts feed exposures where available |
| viewed_vs_swiped_rate | Viewed instead of swiped away |
| average_watch_seconds | Mean watch seconds |
| average_percentage_viewed | Watch time divided by length |
| completion_rate | Viewers who reached the end |
| rewatch_rate | Viewers who looped or watched again |
| shares | Share actions |
| saves | Save/bookmark actions |
| comments | Comment actions |
| follows | Follow/subscribe actions |
| negative_feedback | Not interested, dislikes, hides, reports |

## Derived metrics

| Metric | Formula |
|---|---|
| shares_per_reach | shares / reach |
| saves_per_reach | saves / reach |
| non_follower_reach_per_follower | non_follower_reach / follower_count |
| metric_lift | log((actual + ε)/(expected + ε)) |
| velocity | Δviews / Δtime |
| acceleration | Δvelocity / Δtime |
| decay | negative acceleration or slope decline |
