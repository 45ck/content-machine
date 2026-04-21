# Process Timeline: How We Got Here

## Phase 1 — Surface observation

The initial Reddit screenshots suggested a real creator-side problem:

```text
More creators + more short-form supply + more algorithmic competition
= less predictable reach and weaker passive follower growth.
```

The visible Reddit comments also pointed toward:

```text
crowding
algorithm selectivity
shares / saves over passive views
bot / fake-view dilution
non-follower discovery problems
```

## Phase 2 — First mathematical model

We started with a generic rank score:

```text
RankScore = Attention + ShareSend + Interaction + TopicMatch + Relationship + Freshness + CreatorHealth - Penalties + Exploration
```

This was useful but too linear.

## Phase 3 — Short-form-specific model

We then moved from platform ranking generally to short-form ranking specifically:

```text
Stop / Hook
Retention
Rewatch / Loop
Shares / Saves / Comments / Follows
Negative feedback
Audience expansion
```

This produced TikTok, Instagram Reels, and YouTube Shorts variants.

## Phase 4 — Grey-box architecture

We recognized that modern recommenders are not simple formula engines. The model became:

```text
Eligibility gate
→ candidate retrieval
→ personalized ranking
→ reranking / diversity
→ test distribution
→ expansion waves
→ real-time updates
```

## Phase 5 — Proof-seeking

We then tried to prove or justify each mechanism:

```text
Expected utility ranking: mathematically provable.
Retention as survival curve: mathematically grounded.
Exploration: supported by bandit theory.
Expansion: supported by Bayesian sequential testing.
Candidate generation + ranking: supported by YouTube recommender research.
Real-time learning: supported by ByteDance Monolith research.
Duration debiasing: supported by Kuaishou duration-bias research.
```

## Phase 6 — Accuracy upgrade

The model was improved by replacing raw metrics with empirical-Bayes evidence:

```text
PosteriorRate = (events + prior_strength × baseline) / (opportunities + prior_strength)
```

and replacing raw watch seconds with duration-debiased watch quantiles.

## Phase 7 — Hypothesis ensemble

Rather than pretend one formula is exact, we built a hypothesis ensemble. Each subsystem now has multiple competing theories ranked by:

```text
Evidence
Mathematical modelability
Creator observability
Predictive usefulness
Falsifiability
Platform transferability
```

## Phase 8 — Validation pass

The final pass confirmed, partially confirmed, inferred, weakened, or denied each major theory.

## Current state

The best current reconstruction is:

```text
Reach_p(v)
=
Eligibility_p(v)
·
Σ_g Σ_k
AudienceSize_{p,g,k}
·
Π_{j=0}^{k}
Φ(
  (μ_{p,v,g,j} - θ_{p,g,j,t}) /
  sqrt(σ²_{p,v,g,j} + τ²_p)
)
```

with:

```text
μ = predicted viewer utility for audience cluster g at wave j
θ = required expansion threshold
σ² = uncertainty
τ² = platform randomness / noise
```

The model is now suitable for empirical testing with creator analytics.
