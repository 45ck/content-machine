# API Contracts

## POST /score/draft

Request:

```json
{
  "video_id": "draft_001",
  "platform": "youtube_shorts",
  "creator_id": "creator_123",
  "video_uri": "s3://bucket/draft_001.mp4",
  "caption": "string",
  "hashtags": ["string"],
  "sound_id": "string"
}
```

Response:

```json
{
  "video_id": "draft_001",
  "pre_publish_vps": 78.2,
  "confidence": "medium",
  "subscores": {},
  "recommended_action": "publish_test",
  "edit_recommendations": []
}
```

## POST /score/live

Request:

```json
{
  "video_id": "video_001",
  "checkpoint": "30m",
  "metrics": {
    "views": 1200,
    "shown_in_feed": 2200,
    "viewed_vs_swiped_rate": 0.62,
    "average_percentage_viewed": 0.88,
    "shares": 44,
    "saves": 31,
    "comments": 12,
    "negative_feedback": 2
  }
}
```

Response:

```json
{
  "video_id": "video_001",
  "live_breakout_score": 86.3,
  "wave_probabilities": {
    "wave_1": 0.92,
    "wave_2": 0.74,
    "wave_3": 0.41
  },
  "expected_reach": {
    "24h": 18000,
    "72h": 52000,
    "7d": 77000
  },
  "stall_reason": null
}
```

## GET /videos/{video_id}/diagnostics

Returns:

```json
{
  "strengths": [],
  "weaknesses": [],
  "ablation_explanations": [],
  "editing_actions": []
}
```
