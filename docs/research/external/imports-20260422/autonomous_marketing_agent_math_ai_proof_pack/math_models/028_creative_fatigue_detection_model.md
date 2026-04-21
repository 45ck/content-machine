# Creative Fatigue Detection Model

## Purpose

Detect when creative decay requires refresh.

## Signals

```text
frequency ↑
CTR ↓
CPC ↑
CPM ↑
CVR ↓ or flat
comments worsen
quality score weakens
```

## Fatigue score

```text
fatigue_score =
w1 × normalized_frequency
+ w2 × CTR_decay
+ w3 × CPC_increase
+ w4 × negative_sentiment
+ w5 × conversion_decay
```

## Action

| Fatigue score | Action |
|---|---|
| 0.0–0.3 | keep |
| 0.3–0.6 | rotate |
| 0.6–0.8 | refresh |
| 0.8–1.0 | retire |

## Agent output

```text
creative_id
fatigue_score
evidence
refresh_angle
new_variant_brief
```
