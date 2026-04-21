# Data schema

## Video table

```text
video_id
platform
surface
date_posted
content_form
niche
series_name
hypothesis_id
experiment_id
variant_id
primary_metric
status
```

## Creative feature table

```text
video_id
first_frame_type
hook_type
hook_text
text_system
caption_style
face_presence_ratio
proof_type
story_format
cta_type
length_seconds
audio_type
search_keyword
emotion_stack
```

## Metrics table

```text
video_id
time_checkpoint
exposures
views
engaged_views
chose_to_view_rate
early_hold_rate
avg_percentage_viewed
avg_view_duration
completion_rate
rewatch_rate
saves
sends_shares
comments
follows
profile_clicks
search_traffic
negative_feedback
```

## Qualitative table

```text
video_id
top_comments
sentiment_summary
confusion_points
requests_for_more
viewer_language
trust_risks
new_hypotheses
```

## Decision table

```text
video_id
posterior_win_probability
utility_score
guardrail_status
decision
reason
next_action
```
