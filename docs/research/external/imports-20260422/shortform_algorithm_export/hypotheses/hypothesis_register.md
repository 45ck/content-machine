# Hypothesis Register

## Scoring formula

```text
HypothesisScore = 0.25E + 0.20M + 0.15O + 0.20P + 0.10F + 0.10T
```

where:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
T = platform transferability
```

## Core hypotheses

| ID | Hypothesis | Verdict | Score | Notes |
|---|---|---:|---:|---|
| H001 | Expected utility ranking is the core objective | Confirmed / core | 5.00 | Mathematically optimal under exposure-weighted utility ranking. |
| H002 | Strong intent beats weak intent | Confirmed directionally | 5.00 | Shares/saves/comments/follows are more informative than likes. Exact weights unknown. |
| H003 | Expected watch time / retention is core | Confirmed | 4.85 | Supported by YouTube DNN paper and platform docs. |
| H004 | Negative feedback is asymmetric | Confirmed directionally | 4.85 | Reports/hides/not-interested should penalize more than passive skips. |
| H005 | Sequential expansion waves drive reach | Partially confirmed | 4.85 | Instagram Trial Reels strongly supports test-and-expand logic. |
| H006 | Duration-debiased watch score beats raw watch seconds | Confirmed in research | 4.70 | Kuaishou duration-bias research supports this. |
| H007 | YouTube viewed-vs-swiped is an entry gate | Confirmed | 4.70 | Metric is official in Shorts analytics. |
| H008 | Eligibility is multiplicative or cap-like | Confirmed directionally | 4.65 | Gate exists; numeric form private. |
| H009 | Topic fit is audience-specific | Confirmed conceptually | 4.50 | Core recommender behavior. |
| H010 | Instagram sends/saves matter heavily for unconnected reach | Partially confirmed | 4.50 | Official signals support this; dominance over likes needs testing. |
| H011 | Hook is better modeled by early hazard | Inferred / strong | 4.45 | Mathematically stronger than one 3s metric. |
| H012 | Posterior expansion probability beats fixed threshold | Inferred / strong | 4.45 | Bayesian model handles uncertainty and plateaus. |
| H013 | User interest is a dynamic embedding | Confirmed conceptually | 4.40 | Exact update private. |
| H014 | Video quality updates in batches | Inferred / strong | 4.40 | Consistent with wave distribution and online recommenders. |
| H015 | Swipe = hook failure + preference mismatch | Inferred / strong | 4.35 | Explains why not all swipes mean same thing. |
| H016 | Topic clarity affects routing | Inferred / strong | 4.25 | Strong creator-side proxy. |
| H017 | Exploration is uncertainty-based | Confirmed directionally | 4.20 | Exact bandit equation private. |
| H018 | Retrieval uses candidate buckets | Inferred / strong | 4.20 | Necessary at scale; YouTube confirms two-stage architecture. |
| H019 | Originality matters more on Instagram | Confirmed directionally | 4.20 | Instagram originality guidance supports this. |
| H020 | Session state is separate from long-term state | Confirmed directionally | 4.10 | YouTube surfaces use different context. |
| H021 | TikTok favorites are strong intent | Partially confirmed | 4.10 | Exact ordering unknown. |
| H022 | Competition raises expansion thresholds | Confirmed conceptually | 4.00 | Finite attention and YouTube competition guidance support this. |
| H023 | Trend decay is exponential | Inferred | 3.95 | Useful but niche-specific. |
| H024 | First-frame salience is direct ranking signal | Weak as direct signal | 3.35 | Better as a cause of StopScore. |
| H025 | Follower count directly boosts TikTok FYP | Denied | 1.00 | TikTok says follower count is not a direct recommendation factor. |
| H026 | Views alone are the main quality signal | Denied | 1.00 | Views represent exposure/starts; engaged views and retention are stronger. |
| H027 | One negative action kills a video | Denied | 1.00 | Negative actions are signals, not deterministic blockers. |

## Recommended status labels

```text
Core: build into every model.
Strong: include if data allows.
Test: include as candidate hypothesis and update weights.
Secondary: useful for diagnosis but not core.
Denied: do not use except as a misconception to avoid.
```
