# Mission and Boundaries

## Mission

Build an AI scoring system that predicts, before and shortly after posting, whether a short-form video is likely to:

```text
stop the scroll
hold attention
earn completion or rewatch
generate shares/saves/comments/follows
survive negative feedback
match the right audience cluster
pass expansion waves
achieve top-decile normalized performance
```

## What the system should output

### Pre-publish

```text
Viral Potential Score
Hook / Scroll-Stop Score
Retention Score
Shareability Score
Saveability Score
Audience-Fit Score
Trend-Freshness Score
Eligibility Score
Negative-Risk Score
TRIBE Neural-Response Score
Recommended edit actions
```

### Post-publish / live

```text
Live Breakout Score
Wave 1 pass probability
Wave 2 pass probability
Wave 3 pass probability
Expected 24h reach
Expected 72h reach
Expected 7d reach
Stall reason
```

## Boundary conditions

This system does not claim:

```text
to know private TikTok/Reels/Shorts weights
to clone proprietary source code
to predict virality perfectly
to bypass platform policies
to replace real A/B tests or live analytics
```

It does claim:

```text
the signal families are replicable
the math is defensible
the scoring model can be tested
the system can become more accurate using creator analytics
TRIBE can be tested as a pre-publish lift layer
```

## Definition of “proof-grade”

A model is proof-grade when:

```text
its assumptions are explicit
its target is measurable
its predictions are falsifiable
its value is tested against baselines
its contribution survives ablation
its uncertainty is reported
its failure modes are known
```
