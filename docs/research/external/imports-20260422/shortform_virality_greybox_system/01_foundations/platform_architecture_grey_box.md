# Platform Architecture Grey-Box

## Core architecture

```text
User/session context
        ↓
Candidate generation
        ↓
Eligibility filtering
        ↓
Ranking by predicted utility
        ↓
Small audience test
        ↓
Metric observation
        ↓
Expansion / stall decision
        ↓
Real-time model updates
```

## Replica architecture

```text
Video draft
   ↓
Pre-publish feature extraction
   ↓
Specialist signal models
   ↓
Viral Potential Score
   ↓
Publish
   ↓
Early analytics ingestion
   ↓
Expansion-wave model
   ↓
Live Breakout Score
   ↓
Postmortem + training data
```

## Strongest master equation

```text
Reach_p(v)
=
Σ_k [
  AudiencePool_{p,k}
  · σ(
      (
        α_p · Stop_k
      + β_p · Retention_k
      + γ_p · Intent_k
      + δ_p · TopicFit_k
      + η_p · Relationship_k
      + κ_p · CreatorTrust
      + μ_p · Freshness_k
      + ξ_p · Exploration_k
      - λ_p · NegativeFeedback_k
      - ρ_p · Saturation_k
      - θ_{p,k}
      )
      / T_p
    )
  · Eligibility_p(v)
]
```

## Platform-specific calibrations

Do not use one score for all platforms.

```text
TikTok    -> retention, topic fit, trend sound, exploration, skip risk
Reels     -> retention, sends/DM shares, saves, originality, social graph
Shorts    -> viewed-vs-swiped, APV, satisfaction, subscribe, negative feedback
```
