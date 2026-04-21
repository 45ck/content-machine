# YouTube Shorts Grey-Box Replica

## Supported signal classes

YouTube Shorts analytics expose “Shown in feed” and “How many chose to view,” defined as viewed versus swiped away. YouTube recommendation documentation emphasizes personalization, watch behavior, satisfaction, and negative feedback.

## Most defensible equation

```text
YTShortsScore =
σ(
  1.40·ViewedVsSwiped
+ 1.25·AveragePercentageViewed
+ 0.90·Retention
+ 0.70·SatisfactionProxy
+ 0.55·SubscribeIntent
+ 0.40·RemixPotential
- 1.30·NotInterestedRisk
- 0.90·DislikeRisk
- 0.70·ShowFewerShortsRisk
)
× Eligibility
```

## Important submodels

```text
Viewed-vs-swiped model
APV / retention model
Satisfaction proxy
Subscribe/follow intent
Negative feedback model
Cascade model
```

## Primary data to collect

```text
shown in feed
viewed versus swiped away
views
engaged views
average view duration
average percentage viewed
likes
comments
shares
subscribers gained
dislikes
not interested / don’t recommend channel if available
```

## Validation

```text
ViewedVsSwiped × APV
should predict 24h/72h Shorts expansion better than raw views.
```
