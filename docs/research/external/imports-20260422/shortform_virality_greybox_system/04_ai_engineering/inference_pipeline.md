# Inference Pipeline

## Pre-publish inference

```text
input: draft video
extract video/audio/text/OCR features
run eligibility gate
run scroll-stop model
run retention model
run intent/share/save models
run audience-fit model
run negative-risk model
run TRIBE feature extractor if enabled
run final VPS-P calibrator
return score + edit diagnostics
```

## Live inference

```text
input: video_id + early metrics
fetch pre-publish features and VPS-P
normalize early metrics against baselines
update Bayesian posteriors
compute velocity/acceleration/decay
run live breakout model
return wave probabilities and stall reasons
```

## Output schema

```json
{
  "video_id": "draft_042",
  "platform": "youtube_shorts",
  "pre_publish_vps": 81.4,
  "confidence": "medium",
  "subscores": {
    "eligibility": 94,
    "scroll_stop": 82,
    "retention": 76,
    "shareability": 69,
    "saveability": 71,
    "audience_fit": 84,
    "trend_freshness": 63,
    "creator_trust": 74,
    "negative_risk": 18,
    "saturation_penalty": 27,
    "tribe_response": 81
  },
  "recommendation": "revise_then_publish",
  "edits": [
    "Move payoff from 13s to 7s",
    "Cut 1.8s of setup",
    "Add clearer first-frame text"
  ]
}
```

## Latency strategy

Run expensive feature extraction asynchronously:

```text
cheap score first: metadata + transcript + basic visual
full score later: embeddings + TRIBE + retention sequence
```
