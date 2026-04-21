# References and Evidence Notes

This file records the main public sources used to support the grey-box reconstruction. Exact platform source code and coefficients remain private.

## Official platform documentation

### TikTok — How recommendations work

URL: https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content

Supports:

```text
user interactions
content information
user information
likes
shares
comments
full watches
skips
sounds
hashtags
views
country
language
location
device
time zone/day
```

Use in model:

```text
TikTok = user interactions + content metadata + user context.
Watch behavior and user interactions are stronger than weak context signals.
```

### TikTok Newsroom — How TikTok recommends videos #ForYou

URL: https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you

Supports:

```text
ranking based on combinations of factors
negative feedback such as not interested
full watch as stronger signal
follower count not direct recommendation factor
recommendation diversity
```

Use in model:

```text
TikTok follower count is indirect, not direct.
Exploration/diversity and negative feedback exist.
```

### Instagram — Ranking Explained

URL: https://about.instagram.com/blog/announcements/instagram-ranking-explained

Supports:

```text
Reels ranking uses user activity:
liked, saved, reshared, commented on, engaged with recently.
```

Use in model:

```text
Instagram Reels uses multi-signal ranking, including saves and reshares.
```

### Meta — How AI ranks content on Facebook and Instagram

URL: https://about.fb.com/news/2023/06/how-ai-ranks-content-on-facebook-and-instagram/

Supports:

```text
Meta uses many AI predictions to estimate content value.
Predicted sharing is one example.
No single metric perfectly captures value.
```

Use in model:

```text
Expected viewer utility = weighted predictions of multiple outcomes.
```

### Instagram Creators — Trial Reels

URL: https://creators.instagram.com/blog/instagram-trial-reels

Supports:

```text
Trial Reels can be shared with non-followers first.
Creators receive performance data.
Performance can determine broader sharing.
```

Use in model:

```text
Non-follower test and expansion-wave logic.
```

### Instagram Creators — Recommendations and Originality

URL: https://creators.instagram.com/blog/recommendations-and-originality

Supports:

```text
original content
smaller creators gaining new audiences
changes to ranking / recommendations
```

Use in model:

```text
Originality acts as eligibility/ranking multiplier, especially on Instagram.
```

### YouTube Shorts analytics — Shown in feed / How many chose to view

URL: https://support.google.com/youtube/answer/12942217?co=YOUTUBE._YTVideoType%3Dshorts&hl=en

Supports:

```text
Shown in feed
How many chose to view
viewed versus swiped away
```

Use in model:

```text
YouTube Shorts entry gate = ViewedVsSwipedAway.
```

### YouTube recommendations and Shorts guidance

URL: https://support.google.com/youtube/answer/16089387?hl=en

Supports:

```text
personalized recommendations
watch history
search history
subscriptions
likes/dislikes
not interested
don't recommend channel
satisfaction signals
```

Use in model:

```text
YouTube uses satisfaction and negative feedback, not just views.
```

### YouTube recommendation system overview

URL: https://support.google.com/youtube/answer/16533387?hl=en

Supports:

```text
content performance
personalization
viewer satisfaction
whether viewers choose to watch
how long viewers watch
positive engagement
external factors such as competition and topic demand
```

Use in model:

```text
Expected utility, retention, and competition-pressure assumptions.
```

## Research papers

### Deep Neural Networks for YouTube Recommendations

URL: https://research.google.com/pubs/archive/45530.pdf

Supports:

```text
two-stage architecture:
1. candidate generation
2. ranking
expected watch time instead of only click probability
freshness
exploration/exploitation
large-scale deep recommender systems
```

Use in model:

```text
Candidate retrieval + ranking architecture.
Expected watch time as core objective.
```

### ByteDance Monolith — Real Time Recommendation System

URL: https://arxiv.org/abs/2209.07663

Supports:

```text
real-time recommendation
short-video ranking
online training
sparse dynamic recommendation features
non-stationary data
```

Use in model:

```text
Real-time user/video/creator update layer.
```

### Kuaishou D2Q — Duration bias in watch-time prediction

URL: https://arxiv.org/abs/2206.06003

Also: https://dl.acm.org/doi/10.1145/3534678.3539092

Supports:

```text
raw watch time is confounded by video duration
duration-deconfounded quantile prediction
short-video recommendation
```

Use in model:

```text
DurationDebiasedWatch = watch-time quantile within similar length bucket.
```

### Conditional Quantile Estimation for uncertain watch time prediction

URL: https://arxiv.org/html/2407.12223v4

Supports:

```text
watch-time uncertainty
conditional quantile regression
short-video recommendation
```

Use in model:

```text
Uncertainty-aware watch-time estimates.
```

### Meta HSTU / Generative Recommenders

URL: https://arxiv.org/abs/2402.17152

Supports:

```text
sequential recommender modeling
recommendation as sequential transduction
large-scale production recommender models
```

Use in model:

```text
Sequence-based user/session modeling.
```

## Important caveat

These sources support the architecture and signal classes. They do **not** reveal exact private coefficients for TikTok, Instagram, or YouTube. All numeric coefficients in this export are priors/hypotheses for testing.
