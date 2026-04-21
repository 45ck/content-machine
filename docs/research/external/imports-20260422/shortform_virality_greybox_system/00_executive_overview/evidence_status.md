# Evidence Status

## Strongly supported

```text
Ranking by expected utility is optimal under standard score-and-sort assumptions.
Viewer utility should combine multiple predicted outcomes, not views alone.
Expected watch time can be derived from retention curves.
Duration-normalized engagement is superior to raw view counts.
Recommender systems require exploration under uncertainty.
Expansion waves are rational under Bayesian sequential testing.
```

## Public platform support

TikTok publicly describes recommendation inputs such as user interactions, likes, shares, comments, full watches, skips, sounds, hashtags, views, country, device settings, language, location, time zone, day, and device type.

YouTube Shorts exposes “Shown in feed” and “How many chose to view,” defined as the percentage of times viewers viewed the Short instead of swiping away.

Meta says its AI systems combine many predictions and gives predicted sharing as one example signal.

Instagram’s creator recommendation update supports originality and small-audience testing before wider expansion.

The YouTube recommender paper describes a two-stage system: candidate generation followed by ranking, with ranking trained toward expected watch time rather than click probability.

## Supported by academic and industry research

```text
short-video engagement prediction benefits from multimodal signals
NAWP and ECR are better engagement labels than raw views or likes
bandit theory supports exploration bonuses
cascade models support post-publish spread prediction
TRIBE v2 can provide neural-response features for pre-publish testing
```

## Unknown

```text
exact TikTok/Reels/Shorts coefficients
exact platform neural architectures
exact recommendation thresholds
private account-level eligibility features
private per-user utility functions
```

## Conclusion

The architecture is supported. The coefficients must be learned from analytics.
