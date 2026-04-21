# Mathematical modeling overview

## Core principle

Organic virality is not deterministic. It is a stochastic process driven by viewer behaviour, platform distribution decisions, content supply, timing, and niche context.

The purpose of the mathematical layer is not to pretend to control randomness. Its purpose is to:

```text
1. define what success means;
2. estimate whether a creative variant is likely better than baseline;
3. prevent false positives from noisy samples;
4. allocate exposure toward stronger variants;
5. kill weak variants quickly;
6. detect when a result is luck rather than mechanism.
```

## System view

Each video is modelled as a funnel:

```text
Exposure
→ chose-to-view / viewed-vs-swiped
→ early hold
→ average percentage viewed
→ completion
→ replay
→ save / send / comment / follow
→ search long-tail
→ repeat audience
```

Each gate has a probability or continuous response. A video is not “good” or “bad”; it has a vector of behavioural responses.

## Key objects

```text
Video v
Platform p
Surface s
Audience context c
Creative feature vector x_v
Metric vector y_v
Baseline distribution B
Posterior belief P(theta_v | data)
Utility score U(v)
Guardrail vector G(v)
Decision D ∈ {kill, rewrite, replicate, scale}
```

## Decision philosophy

```text
Scale only when probability of improvement is high and guardrails pass.
Replicate when the signal is promising but underpowered.
Rewrite when one gate succeeds and another fails.
Kill when repeated variants fail or trust guardrails break.
```
