# Build Roadmap

## Phase 0 — Data foundation

```text
collect historical videos
collect video files
collect transcripts/captions/hashtags/sounds
collect post time and creator/account metadata
collect 15m / 30m / 1h / 24h / 72h / 7d metrics
normalize all metrics by platform, niche, duration, and creator baseline
```

## Phase 1 — Minimum viable scoring engine

Build:

```text
Creator Baseline Model
Scroll-Stop Model
Retention Model
Intent Model
Negative Risk Model
Audience Fit Model
Eligibility Gate
Pre-Publish Score
```

Goal:

```text
rank unpublished drafts better than random/manual selection
```

## Phase 2 — Live breakout engine

Build:

```text
Bayesian Expansion-Wave Model
Velocity/Acceleration Model
Cascade Model
Stall Detector
```

Goal:

```text
predict 24h/72h expansion from first 15/30/60 minutes
```

## Phase 3 — Experimental lift layers

Build:

```text
TRIBE Feature Layer
Trend/Freshness Model
Saturation/Fatigue Model
Contextual Bandit Variant Selector
```

Goal:

```text
increase top-decile hit rate and improve content experimentation
```

## Phase 4 — Productionization

Build:

```text
feature store
model registry
inference API
dashboard
monitoring
experiment tracking
drift detection
creator-specific calibration
platform-specific calibration
```

## Phase 5 — Continuous learning

```text
every published video becomes a labeled data point
variant tests feed bandit learner
ablation results decide signal survival
model confidence controls publish/test/discard decisions
```
