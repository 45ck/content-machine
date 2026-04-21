# All-In-One Short-Form Algorithm Export



---

<!-- Source file: README.md -->


# Short-Form Algorithm Grey-Box Research Export

**Export date:** 2026-04-21  
**Project:** Mathematical reconstruction of short-form recommendation systems across TikTok, Instagram Reels, and YouTube Shorts.

This package contains the visible work product from the conversation: model versions, formulas, hypothesis registers, confirmation/denial notes, research references, experiment plans, and a reconstructed conversation/process log.

## Folder structure

```text
shortform_algorithm_export/
├── README.md
├── ALL_IN_ONE_EXPORT.md
├── manifest.json
├── conversation/
│   ├── 00_visible_conversation_reconstruction.md
│   └── 01_process_timeline.md
├── models/
│   ├── 01_v1_multi_platform_ranking.md
│   ├── 02_v2_short_form_core_algorithm.md
│   ├── 03_v3_grey_box_architecture.md
│   ├── 04_v4_calibrated_stochastic_model.md
│   ├── 05_v5_hypothesis_ensemble.md
│   ├── 06_v6_weighted_reconstruction_engine.md
│   └── 07_v7_validation_confirm_deny.md
├── math/
│   └── master_equations.md
├── hypotheses/
│   ├── hypothesis_register.md
│   └── platform_specific_hypotheses.md
├── experiments/
│   └── validation_plan.md
├── templates/
│   ├── video_metrics_template.csv
│   ├── hypothesis_register_template.csv
│   └── model_inputs_schema.json
├── sources/
│   └── references.md
└── input_screenshots/
    ├── reddit_instagram_marketing_screenshot_1.jpeg
    └── reddit_instagram_marketing_screenshot_2.jpeg
```

## Included

- **Visible conversation reconstruction:** exact user request sequence and a structured summary of the assistant deliverables.
- **Research-backed model notes:** official platform sources and recommender-system papers used as evidence.
- **Mathematical formulas:** ranking, retention, empirical Bayes smoothing, posterior expansion, wave-based reach, and hypothesis-weighted ensemble updates.
- **Hypothesis register:** confirmed, partially confirmed, inferred, weak, and denied theories.
- **Validation plan:** experiments to test which hypotheses predict real reach.
- **Data templates:** CSV schema for collecting creator analytics.
- **Original input screenshots:** the two Reddit screenshots that started the discussion.

## Not included

This export does **not** include private hidden chain-of-thought. It includes a safe high-level process reconstruction: the visible decisions, model versions, equations, evidence trail, and how the work evolved.

## Core conclusion

```text
Short-form reach is best modeled as:

Eligibility
× posterior probability of above-baseline viewer satisfaction
× probability of passing each audience expansion wave
× reachable audience size
− negative feedback / saturation / eligibility penalties
```

## Current confidence levels

```text
High confidence:
- retention / expected watch time matters
- negative feedback matters
- recommendation eligibility exists
- YouTube Shorts viewed-vs-swiped is real
- two-stage retrieval/ranking is a strong architecture model
- raw views alone are weak

Medium confidence:
- Instagram unconnected reach heavily weights sends/saves
- TikTok favorites/shares/comments are stronger intent than likes
- expansion waves approximate the visible plateau behavior
- topic clarity helps routing

Low confidence:
- exact hidden coefficients
- exact internal neural architecture for each platform
- exact audience wave thresholds
```



---

<!-- Source file: conversation/00_visible_conversation_reconstruction.md -->


# Visible Conversation Reconstruction

This file reconstructs the visible conversation path and the deliverables produced. It is not a hidden chain-of-thought dump. It is a safe process record of what was requested, what was built, and how the model evolved.

## Starting artifact

The conversation began with two screenshots from Reddit's `r/InstagramMarketing`. The key visible claim from the screenshots was that Instagram and short-form platforms feel more crowded, less predictable, and more dependent on shares, saves, retention, and non-follower discovery than simple follower engagement.

The two input screenshots are preserved in:

```text
input_screenshots/reddit_instagram_marketing_screenshot_1.jpeg
input_screenshots/reddit_instagram_marketing_screenshot_2.jpeg
```

## User request sequence

### 1. Initial request

> Create a mathematical algorithm that matches different platforms ie Instagram and TikTok. I know it won’t be exact but based on what top influencers and creators and social media marketers say, try and recreate it as accurately as possible.

**Deliverable created:** a first grey-box multi-platform ranking model with:

```text
RankScore_p(u,c,t)
= Attention + Shares/Sends + Interaction + TopicMatch + Relationship + Freshness + CreatorHealth - Penalties + Exploration
```

It introduced baseline normalization, platform-specific weights, and expansion waves.

---

### 2. Short-form specialization request

> make algorithms for short form content mathmatically

**Deliverable created:** a short-form-specific model for TikTok, Instagram Reels, and YouTube Shorts. It introduced:

```text
HookScore
RetentionScore
EngagementScore
NegativeFeedbackScore
TopicMatch
RelationshipScore
CreatorHealth
ExpansionProbability
ViralIndex
```

---

### 3. First deep grey-box request

> no research deeper grey etc

**Deliverable created:** a deeper grey-box model treating the systems as neural recommenders with:

```text
Eligibility gate
Candidate retrieval
Ranking model
Diversity / fatigue filters
Small audience test
Expansion or decay
```

This version introduced user/video embeddings, retention survival curves, topic fit, negative feedback, platform formulas, and Bayesian wave expansion.

---

### 4. Continued grey-box deepening

> no research deeper grey etc

**Deliverable created:** a deeper version that emphasized:

```text
video × viewer × session × time × surface
```

The model moved from post scoring to expected viewer satisfaction prediction.

---

### 5. Further grey-box deepening

> no research deeper grey etc

**Deliverable created:** a more technical reconstruction with:

```text
Eligibility_p(v,c)
CandidateSet_p(u)
NeuralRanker(e_u, e_v, e_c, session, time)
P_stop, P_complete, P_rewatch, P_share, P_save, P_swipe, P_hide, P_report
```

It also introduced a nonlinear utility model:

```text
Utility = βᵀx + xᵀQx + MLP_residual(x)
```

---

### 6. Proof request

> contoue research proove that this all works remember look for mathematical proof or as close as we can get dont stop trying.

**Deliverable created:** a proof-style research pass. It explained:

- ranking by expected utility is optimal under standard assumptions;
- multi-signal scoring follows from linearity of expectation;
- watch time is the area under the retention curve;
- baseline-normalized metrics are better than raw metrics;
- expansion waves can be modeled as Bayesian sequential testing;
- exploration is justified by bandit theory;
- real-time learning is required for non-stationary short-form feeds.

---

### 7. Accuracy challenge

> no we can make it better and more accurate.

**Deliverable created:** V4 calibrated stochastic model. It replaced simple weighted scores with:

```text
Empirical-Bayes metric evidence
Duration-debiased retention
Topic clarity
Posterior expansion probability
Nonlinear interaction terms
Platform-specific priors
```

---

### 8. Hypothesis ensemble request

> proceed deepen it and start making several hypotheses for each part of the system and how to model it etc and rank them by criteria etc

**Deliverable created:** V5 hypothesis ensemble. It split the system into subsystems and ranked hypotheses using:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
```

---

### 9. Confirmation

> yes

**Deliverable created:** V6 hypothesis-weighted reconstruction engine. It formalized:

```text
HypothesisScore = 0.25E + 0.20M + 0.15O + 0.20P + 0.10F + 0.10T
```

and added an online ensemble update rule:

```text
w_i(t+1) = w_i(t) exp(-η Loss_i) / Σ_j w_j(t) exp(-η Loss_j)
```

---

### 10. Deep validation request

> dig deeper and confirm or deny theories dig deeper in all cases for each

**Deliverable created:** V7 validation pass. It separated theories into:

```text
CONFIRMED
PARTIALLY CONFIRMED
INFERRED
WEAK / DENIED
```

It confirmed or refined theories around eligibility, originality, retrieval, dynamic user state, topic routing, stop-scroll metrics, retention, duration bias, negative feedback, exploration, expansion waves, real-time learning, saturation, post time, follower count, and platform-specific differences.

---

### 11. Export request

> export all into zip including sub folders, markdown file and everything we have done all conversations including how we got here etc

**Deliverable created:** this structured ZIP package.

## Final development path

```text
V1: Basic multi-platform ranking score
V2: Short-form-specific mathematical model
V3: Grey-box recommender architecture
V4: Calibrated stochastic Bayesian model
V5: Hypothesis ensemble with scoring criteria
V6: Hypothesis-weighted reconstruction engine
V7: Confirm / deny / refine validation pass
Export: structured ZIP with markdown, formulas, sources, templates, and process record
```



---

<!-- Source file: conversation/01_process_timeline.md -->


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



---

<!-- Source file: models/01_v1_multi_platform_ranking.md -->


# V1 — Multi-Platform Ranking Algorithm

## Core idea

The first model treated each platform as a ranker that estimates how valuable a post is for a specific viewer.

For platform `p`, viewer `u`, creator/account `a`, content `c`, and time `t`:

```text
RankScore_p(u,c,t)
=
wA_p · Attention(c,t)
+ wS_p · ShareSend(c,t)
+ wI_p · Interaction(c,t)
+ wT_p · TopicMatch(u,c)
+ wR_p · Relationship(u,a)
+ wV_p · FreshnessVelocity(c,t)
+ wH_p · CreatorHealth(a,c)
- Penalty_p(u,c,a,t)
+ Exploration_p(u,c)
```

## Baseline normalization

Raw likes/views are weak. Compare each metric against the expected baseline for:

```text
platform + content format + niche + video length + account size band
```

Metric normalization:

```text
Z_m = tanh( ln((rate_m + ε) / (baseline_m + ε)) )
```

where:

```text
rate_m = observed metric rate
baseline_m = median/expected rate for similar content
ε = small constant, e.g. 0.0001
```

## Signal blocks

### Attention

```text
Attention =
0.30 · Z_3sHold
+ 0.30 · Z_CompletionRate
+ 0.25 · Z_AvgWatchRatio
+ 0.15 · Z_RewatchRate
- 0.20 · Z_EarlySkipRate
```

### Share / send

```text
ShareSend =
0.55 · Z_DMShareRate
+ 0.25 · Z_PublicShareRate
+ 0.20 · Z_CopyLinkOrExternalShareRate
```

### Interaction

```text
Interaction =
0.30 · Z_LikeRate
+ 0.25 · Z_CommentRate
+ 0.20 · Z_SaveOrFavoriteRate
+ 0.15 · Z_FollowRate
+ 0.10 · Z_ProfileTapRate
```

### Topic match

```text
TopicMatch(u,c) =
0.60 · cosine(UserInterestVector_u, ContentTopicVector_c)
+ 0.20 · SearchKeywordMatch(c)
+ 0.10 · AudioSoundClusterMatch(c)
+ 0.10 · GeoLanguageFit(u,c)
```

### Relationship

```text
Relationship(u,a) =
0.30 · Z_DMHistory
+ 0.25 · Z_CommentHistory
+ 0.20 · Z_ProfileVisitHistory
+ 0.15 · Z_PastSharesBetweenUsers
+ 0.10 · Z_CloseGraphSignal
```

## Platform weight priors

| Platform surface | Attention | Shares/Sends | Interaction | Topic Match | Relationship | Freshness | Creator Health |
|---|---:|---:|---:|---:|---:|---:|---:|
| TikTok FYP | 0.42 | 0.14 | 0.16 | 0.18 | 0.02 | 0.04 | 0.04 |
| Instagram Reels / Explore | 0.30 | 0.22 | 0.16 | 0.16 | 0.04 | 0.06 | 0.06 |
| Instagram Feed | 0.18 | 0.15 | 0.22 | 0.12 | 0.20 | 0.08 | 0.05 |
| Instagram Stories | 0.15 | 0.12 | 0.15 | 0.03 | 0.40 | 0.10 | 0.05 |

## Expansion model

For wave `k`:

```text
CohortScore_p,k = mean RankScore over viewers in test cohort k
```

Expansion probability:

```text
P_expand_p,k = sigmoid((CohortScore_p,k - θ_p,k) / τ_p)
```

Next reach:

```text
NextReach_p,k+1 = AvailableAudience_p,k+1 · P_expand_p,k · Eligibility(c)
```

## Limitation

V1 was directionally useful, but too simple. It treated the system as a weighted score rather than a stochastic recommender with uncertainty, candidate retrieval, user embeddings, and audience-wave testing.



---

<!-- Source file: models/02_v2_short_form_core_algorithm.md -->


# V2 — Short-Form Core Algorithm

## Variables

For short-form video `v`:

```text
I  = impressions / shown in feed
V  = views
S  = swipes / quick skips
W  = total watch seconds
L  = video length in seconds
C  = completed views
R  = rewatches / loops
K  = likes
M  = comments
H  = shares / sends
F  = saves / favorites
G  = follows / subscribers gained
P  = profile visits
N  = negative actions
```

Rates:

```text
ViewRate        = V / I
SwipeRate       = S / I
AvgWatchRatio   = (W / V) / L
CompletionRate  = C / V
RewatchRate     = R / V
LikeRate        = K / V
CommentRate     = M / V
ShareRate       = H / V
SaveRate        = F / V
FollowRate      = G / V
ProfileTapRate  = P / V
NegativeRate    = N / I
```

## Hook score

```text
HookScore =
0.45 · Z(ViewRate)
+ 0.35 · Z(1 - SwipeRate)
+ 0.20 · Z(First3SecondHold)
```

For YouTube Shorts, replace the first term with viewed-vs-swiped:

```text
YouTubeHook =
0.60 · Z(ViewedVsSwipedAway)
+ 0.25 · Z(First3SecondHold)
+ 0.15 · Z(ViewRate)
```

## Retention score

```text
RetentionScore =
0.30 · Z(AvgWatchRatio)
+ 0.30 · Z(CompletionRate)
+ 0.25 · Z(RewatchRate)
+ 0.15 · Z(ViewRate)
```

Short video variant:

```text
RetentionScore_short =
0.25 · Z(AvgWatchRatio)
+ 0.40 · Z(CompletionRate)
+ 0.25 · Z(RewatchRate)
+ 0.10 · Z(ViewRate)
```

Longer short-form variant:

```text
RetentionScore_long =
0.40 · Z(AvgWatchRatio)
+ 0.25 · Z(CompletionRate)
+ 0.20 · Z(RewatchRate)
+ 0.15 · Z(ViewRate)
```

## Engagement / intent score

```text
EngagementScore =
0.18 · Z(LikeRate)
+ 0.22 · Z(CommentRate)
+ 0.32 · Z(ShareRate)
+ 0.20 · Z(SaveRate)
+ 0.08 · Z(FollowRate)
```

## Negative feedback penalty

```text
PenaltyScore =
0.35 · Z(SwipeRate)
+ 0.25 · Z(NegativeRate)
+ 0.20 · Z(ReportRate)
+ 0.10 · Z(UnfollowRate)
+ 0.10 · Z(LowQualitySignals)
```

## Generic short-form ranking model

```text
RankScore_p(u,v,t) =
w1_p · HookScore
+ w2_p · RetentionScore
+ w3_p · EngagementScore
+ w4_p · TopicMatch(u,v)
+ w5_p · RelationshipScore(u,creator)
+ w6_p · CreatorHealth
+ w7_p · FreshnessVelocity
- w8_p · PenaltyScore
+ ExplorationBonus
```

## Platform-specific priors

### TikTok FYP

```text
TikTokScore =
0.20 · HookScore
+ 0.35 · RetentionScore
+ 0.18 · EngagementScore
+ 0.17 · TopicMatch
+ 0.04 · CreatorHealth
+ 0.03 · FreshnessVelocity
+ 0.03 · ExplorationBonus
- 0.20 · PenaltyScore
```

### Instagram Reels

```text
InstagramReelsScore =
0.18 · HookScore
+ 0.28 · RetentionScore
+ 0.26 · ShareSaveScore
+ 0.12 · LikeCommentScore
+ 0.08 · TopicMatch
+ 0.04 · RelationshipScore
+ 0.04 · CreatorHealth
- 0.20 · PenaltyScore
```

### YouTube Shorts

```text
YouTubeShortsScore =
0.30 · HookScore
+ 0.32 · RetentionScore
+ 0.14 · EngagementScore
+ 0.12 · TopicSessionMatch
+ 0.06 · ChannelHealth
+ 0.04 · FreshnessVelocity
+ 0.02 · RemixPotential
- 0.18 · PenaltyScore
```

## Expansion model

```text
P_expand_k = 1 / (1 + e^(-(CohortScore_k - θ_k) / s))
```

Final reach:

```text
FinalReach(v) = Σ_k [AudiencePool_k · σ((Score_k - θ_k) / s) · Eligibility(v)]
```

## Limitation

V2 still used hand-chosen weights. The next improvement was to model the system as a recommender architecture with candidate retrieval, embeddings, uncertainty, and posterior wave expansion.



---

<!-- Source file: models/03_v3_grey_box_architecture.md -->


# V3 — Grey-Box Recommender Architecture

## System stack

A realistic short-form recommender is modeled as:

```text
Eligible content pool
→ candidate generation
→ ranking model
→ diversity / safety / fatigue reranking
→ small audience test
→ expansion or decay
→ real-time feedback update
```

## True hidden object

The system estimates:

```text
Utility_p(u,v,s,t) = E[viewer satisfaction | user, video, creator, session, time]
```

Expanded:

```text
Utility_p =
Σ_i α_i · P(positive_action_i)
+ Σ_j β_j · E(continuous_value_j)
- Σ_k λ_k · P(negative_action_k)
```

Positive actions:

```text
stop_scroll
watch_3s
complete
rewatch
like
comment
share
save
follow
profile_visit
subscribe
remix
```

Continuous outcomes:

```text
watch_seconds
watch_percentage
session_extension
return_probability
long_term_satisfaction
```

Negative actions:

```text
quick_swipe
not_interested
hide
report
dislike
unfollow
don't_recommend_channel
```

## User embedding

```text
e_u(t) =
LayerNorm(
  Σ_i exp(-(t - τ_i) / d_{a_i})
  · strength(a_i)
  · W_{a_i}
  · e_{v_i}
)
```

Action-strength prior:

```text
share/send        = +3.0
save/favorite     = +2.7
full watch        = +2.4
rewatch           = +2.2
comment           = +1.8
like              = +1.2
profile visit     = +1.1
follow/subscribe  = +1.6
quick swipe       = -1.5
not interested    = -3.0
hide              = -3.5
report            = -5.0
```

## Video embedding

```text
e_v =
W_text · TextEmbed(caption + transcript + OCR)
+ W_visual · VisualEmbed(frames)
+ W_audio · AudioEmbed(sound + music + voice)
+ W_meta · MetaEmbed(length + hashtags + format + language)
+ W_creator · CreatorEmbed(c)
+ W_perf · EarlyPerformanceEmbed(v)
```

## Candidate retrieval

```text
CandidateSet_p(u) =
C_interest
∪ C_cowatch
∪ C_creator
∪ C_social
∪ C_trend
∪ C_fresh
∪ C_explore
```

Retrieval score:

```text
RetrieveScore(u,v) =
0.30 · cosine(e_u, e_v)
+ 0.22 · CoWatchPMI(u,v)
+ 0.14 · CreatorAffinity(u,c)
+ 0.10 · TrendVelocity(v,t)
+ 0.08 · SocialGraphSignal(u,v)
+ 0.08 · Freshness(v,t)
+ 0.08 · ExplorationValue(v)
```

Co-watch signal:

```text
CoWatchPMI(a,b) =
log(P(user watches a and b) / (P(user watches a) · P(user watches b)))
```

## Retention survival curve

Let:

```text
T = watch duration
L = video length
S(τ) = P(T ≥ τ)
```

Then:

```text
ExpectedWatchSeconds = ∫_0^L S(τ)dτ
AveragePercentageViewed = ExpectedWatchSeconds / L
CompletionProbability = S(L)
LoopProbability = P(T > L)
```

## Deep utility approximation

```text
x = [StopScore, RetentionScore, IntentScore, TopicFit, RelationshipScore, CreatorTrust, FreshnessVelocity, ExplorationValue, NegativeFeedback, SaturationPenalty]
```

```text
Utility_p(u,v) = β_pᵀx + xᵀQ_p x + MLP_residual_p(x)
```

Important interaction terms:

```text
Retention × TopicFit
WatchTime × ShareRate
StopRate × CompletionRate
SaveRate × TopicClarity
NegativeFeedback × AudienceScale
Originality × Eligibility
```

## Platform-specific grey-box laws

```text
TikTok ≈ Retention × TopicFit × ExplorationConfidence
Instagram Reels ≈ WatchTime × SendsPerReach × Saves × Originality
YouTube Shorts ≈ ViewedVsSwiped × APV × SessionContinuation × Satisfaction
```



---

<!-- Source file: models/04_v4_calibrated_stochastic_model.md -->


# V4 — Calibrated Stochastic Model

V4 corrected the previous hand-weighted formulas by introducing empirical-Bayes evidence, duration-debiased watch scores, topic clarity, nonlinear interactions, and posterior expansion.

## Empirical-Bayes metric evidence

For metric `m`:

```text
x_m ~ Binomial(n_m, p_m)
```

Baseline prior:

```text
p_m ~ Beta(ν_m · b_m, ν_m · (1 - b_m))
```

where:

```text
b_m = baseline rate for platform + niche + length + format + account band
ν_m = prior strength
```

Posterior rate:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

Log-odds evidence over baseline:

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

Uncertainty:

```text
SE_m ≈ sqrt(
  1 / (x_m + ν_m b_m)
  + 1 / (n_m - x_m + ν_m(1 - b_m))
)
```

Final metric signal:

```text
Signal_m = Evidence_m - ζ · SE_m
```

This prevents over-trusting tiny samples like:

```text
3 shares / 20 views
```

## Duration-debiased watch score

Raw watch seconds are biased by video length. Use a duration-conditioned CDF:

```text
F_{p,niche,L}(w) = P(W ≤ w | platform, niche, video_length_bucket)
```

Then:

```text
WatchQuantileScore = Φ^{-1}(F_{p,niche,L}(ObservedWatchTime))
```

This asks:

```text
How exceptional was this watch time for this type of video?
```

## Topic clarity

Topic fit answers:

```text
Is this video relevant to this user?
```

Topic clarity answers:

```text
Does the system know who this video is for?
```

Topic distribution:

```text
TopicVector(v) = softmax(W_topic · e_v)
```

Topic clarity:

```text
TopicClarity(v) = 1 - H(TopicDistribution(v)) / log(K)
```

High clarity:

```text
fitness:       0.78
productivity: 0.08
lifestyle:    0.06
humor:        0.04
other:        0.04
```

Low clarity:

```text
fitness:       0.21
productivity: 0.18
lifestyle:    0.17
humor:        0.16
other:        0.28
```

## Posterior expansion

Instead of:

```text
if Score > threshold: expand
```

use:

```text
expand if P(Quality > Threshold | observed data) is high enough
```

Approximation:

```text
P_expand(k,g) =
Φ((μ_{k,g} - θ_{p,k,g}) / sqrt(σ²_{k,g} + τ²_p))
```

Threshold:

```text
θ_{p,k,g} =
θ_{p,0}
+ a_p · log(1+k)
+ b_p · AudienceDistance(g)
+ c_p · CompetitionPressure(topic,t)
- d_p · TrendBoost(v,t)
```

Expected reach:

```text
ExpectedReach_p(v) =
Eligibility_p(v)
· Σ_{k,g} [AudienceSize_{k,g} · Π_{j=0}^{k} P_expand(j,g)]
```

## Improved platform priors

### TikTok

```text
TikTokBreakout =
σ(
  1.35 · Retention · TopicFit
+ 0.90 · Stop · Retention
+ 0.70 · ShareFavorite · TopicClarity
+ 0.45 · CommentVelocity
+ 0.35 · TrendVelocity
+ 0.30 · Exploration
- 1.20 · NegativeFeedback
- 0.45 · Saturation
)
```

### Instagram Reels

```text
IGBreakout =
σ(
  1.25 · Retention · SendShare
+ 0.85 · Save · TopicClarity
+ 0.55 · Stop · Retention
+ 0.45 · Originality · CreatorTrust
+ 0.30 · FollowRate
- 1.20 · NegativeFeedback
- 0.65 · RepostPenalty
)
```

### YouTube Shorts

```text
YTShortsBreakout =
σ(
  1.30 · ViewedVsSwiped · AveragePercentageViewed
+ 0.85 · Retention · SessionFit
+ 0.55 · SubscribeRate
+ 0.45 · LongTermSatisfaction
+ 0.25 · RemixPotential
- 1.15 · NegativeFeedback
)
```

## V4 improvement over previous models

```text
posterior uncertainty
+ duration debiasing
+ topic clarity
+ nonlinear interactions
+ audience-cluster expansion
+ platform-specific priors
```



---

<!-- Source file: models/05_v5_hypothesis_ensemble.md -->


# V5 — Hypothesis Ensemble

V5 stopped treating the algorithm as one fixed formula. Instead, it treated the system as a set of competing hypotheses that can be ranked, tested, and updated.

## Hypothesis scoring criteria

Each hypothesis receives a `0–5` score on:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
```

Composite:

```text
HypothesisScore = 0.30E + 0.20M + 0.15O + 0.25P + 0.10F
```

Interpretation:

```text
4.5–5.0 = core model
4.0–4.4 = strong hypothesis
3.5–3.9 = useful but uncertain
3.0–3.4 = secondary
<3.0    = weak unless future data supports it
```

## Major subsystems

```text
A. Eligibility gate
B. Candidate retrieval
C. User state model
D. Video representation and topic clarity
E. Stop-scroll / hook
F. Retention and watch-time
G. Engagement intent
H. Negative feedback
I. Ranking objective
J. Exploration
K. Expansion waves
L. Real-time learning
M. Saturation and competition
```

## Top-ranked hypotheses

| Rank | Hypothesis | Score | Status |
|---:|---|---:|---|
| 1 | Expected utility ranking | 5.0 | Core |
| 2 | Two-stage candidate generation + ranking | 4.9 | Core |
| 3 | Expected watch time / retention objective | 4.9 | Core |
| 4 | YouTube Shorts viewed-vs-swiped entry gate | 4.9 | Core for Shorts |
| 5 | Duration-debiased watch-time scoring | 4.8 | Core |
| 6 | Posterior probability expansion waves | 4.8 | Core |
| 7 | User embedding updated by actions | 4.8 | Core |
| 8 | Negative feedback asymmetric penalty | 4.8 | Core |
| 9 | Eligibility as multiplicative gate | 4.7 | Core |
| 10 | Strong intent > weak intent | 4.7 | Core |
| 11 | Sequential wave distribution | 4.7 | Core |
| 12 | Real-time user/video updates | 4.7 | Core |
| 13 | Nonlinear interaction model | 4.6 | Strong |
| 14 | Topic clarity as routing confidence | 4.3 | Strong |
| 15 | Competition pressure raises threshold | 4.3 | Strong |
| 16 | Instagram sends/saves > likes for unconnected reach | 4.0 | Test |
| 17 | Creator trust slow-moving account prior | 4.0 | Test |
| 18 | Trend decay curve | 3.9 | Secondary |
| 19 | First-frame salience model | 3.7 | Secondary |

## Layered model plan

### Layer 1 — creator-observable model

```text
BreakoutProbability =
σ(
  β0
+ β1 StopScore
+ β2 RetentionScore
+ β3 DurationDebiasedWatch
+ β4 ShareSaveScore
+ β5 CommentFollowScore
+ β6 TopicClarity
- β7 NegativeFeedback
)
```

### Layer 2 — platform-specific interaction model

TikTok:

```text
P_breakout =
σ(β0 + β1 Retention·TopicFit + β2 Stop·Retention + β3 ShareFavorite - β4 NegativeFeedback)
```

Instagram:

```text
P_breakout =
σ(β0 + β1 Retention·SendRate + β2 SaveRate·TopicClarity + β3 Originality - β4 NegativeFeedback)
```

YouTube Shorts:

```text
P_breakout =
σ(β0 + β1 ViewedVsSwiped·APV + β2 Retention·SessionFit + β3 SubscribeRate - β4 NegativeFeedback)
```

### Layer 3 — wave model

```text
P_expand_k = Φ((Quality_k - Threshold_k) / Uncertainty_k)
```

with:

```text
Threshold_k = Base + AudienceDistance + CompetitionPressure - TrendBoost
```

## V5 conclusion

```text
Short-form reach is not a reward for engagement.
It is a sequence of statistically controlled expansion decisions.
```



---

<!-- Source file: models/06_v6_weighted_reconstruction_engine.md -->


# V6 — Hypothesis-Weighted Reconstruction Engine

V6 formalized the idea that the model should update as evidence accumulates.

## Evidence-weighted hypothesis score

Each hypothesis gets scored on:

```text
E = evidence strength
M = mathematical modelability
O = creator observability
P = predictive usefulness
F = falsifiability
T = platform transferability
```

Composite:

```text
HypothesisScore =
0.25E + 0.20M + 0.15O + 0.20P + 0.10F + 0.10T
```

## Master model

```text
ExpectedReach_p(v) =
Eligibility_p(v,c)
· Σ_g Σ_k [
  AudienceSize_{p,g,k}
  · Π_{j=0}^{k} P_expand(p,v,g,j,t)
]
```

where:

```text
P_expand(p,v,g,k,t) =
Φ((μ_{p,v,g,k} - θ_{p,g,k,t}) / sqrt(σ²_{p,v,g,k} + τ²_p))
```

and:

```text
μ_{p,v,g,k} = β_pᵀx_{v,g,k} + x_{v,g,k}ᵀQ_p x_{v,g,k} + MLP_p(x_{v,g,k})
```

## Hypothesis-weight update

Each hypothesis `H_i` creates a prediction:

```text
ŷ_i(v) = prediction from hypothesis i for video v
```

Observed outcome:

```text
y(v) = log(1 + reach_72h)
```

Loss:

```text
Loss_i = (y - ŷ_i)^2
```

Update:

```text
w_i(t+1) =
w_i(t) · exp(-η · Loss_i)
/
Σ_j w_j(t) · exp(-η · Loss_j)
```

Final ensemble prediction:

```text
FinalPrediction(v) = Σ_i w_i · ŷ_i(v)
```

## Empirical-Bayes metric engine

For each metric `m`:

```text
x_m = observed events
n_m = opportunities
b_m = baseline rate
ν_m = prior strength
```

Posterior:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

Evidence:

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

Uncertainty-adjusted evidence:

```text
EB_m = Evidence_m - ζ · SE_m
```

## Creator-observable approximation

```text
BreakoutProbability_p(v) =
σ(
  β_0
+ β_1 · EB_Stop
+ β_2 · EB_Retention
+ β_3 · EB_DurationDebiasedWatch
+ β_4 · EB_ShareSave
+ β_5 · EB_Comment
+ β_6 · EB_Follow
+ β_7 · TopicClarity
+ β_8 · FreshnessVelocity
+ β_9 · Retention × ShareSave
+ β_10 · Retention × TopicClarity
- β_11 · EB_NegativeFeedback
- β_12 · SaturationProxy
)
```

## Key V6 thesis

```text
Do not pick one theory upfront.
Let hypotheses compete using actual post-level analytics.
```



---

<!-- Source file: models/07_v7_validation_confirm_deny.md -->


# V7 — Confirm / Deny / Refine Validation Pass

V7 separated theories into verdict categories.

## Verdict key

```text
CONFIRMED
= directly supported by official docs or production recommender research.

PARTIALLY CONFIRMED
= mechanism is supported, exact implementation/weight is not public.

INFERRED
= mathematically likely and consistent with public evidence, but not directly confirmed.

WEAK / DENIED
= current evidence does not support it, or supports a weaker version.
```

## Theory validation summary

| Theory | Verdict | Notes |
|---|---|---|
| Eligibility gate exists | Confirmed | Platforms restrict recommendation eligibility and reduce distribution for some content. |
| Eligibility is a pure product formula | Partially confirmed | Gate exists; exact numeric form private. |
| Originality/repost penalty on Instagram | Confirmed directionally | Instagram emphasizes original content and smaller creator distribution. |
| Candidate retrieval before ranking | Confirmed for YouTube, inferred cross-platform | YouTube DNN paper directly supports two-stage architecture. |
| User state is dynamic | Confirmed conceptually | TikTok/YouTube docs describe behavior-based personalization. |
| Video embeddings are multimodal | Partially confirmed | Content metadata confirmed; exact multimodal internals private. |
| Topic clarity as entropy | Inferred | Strong creator-side proxy, not explicitly confirmed. |
| YouTube viewed-vs-swiped hook gate | Confirmed | YouTube exposes this metric for Shorts. |
| First-frame salience is a direct ranking signal | Weak | Better modeled as affecting stop rate. |
| Expected watch time / retention matters | Confirmed strongly | Supported by YouTube paper and platform docs. |
| Duration-debiased watch time | Confirmed in research, inferred for major platforms | Kuaishou D2Q supports duration bias correction. |
| Raw views are main signal | Denied | Views are exposure; engaged views/retention are stronger. |
| Strong intent > likes | Partially confirmed | Exact hierarchy not public, but multi-signal engagement confirmed. |
| Instagram sends/saves dominate likes | Partially confirmed | Sends/saves are real signals; dominance is a testable hypothesis. |
| TikTok favorites/shares/comments > likes | Partially confirmed | Exact ordering not public. |
| Negative feedback matters | Confirmed | TikTok and YouTube mention skip/not-interested/hide/report/dislike feedback. |
| One negative action kills a video | Denied | Negative feedback is a signal, not a deterministic blocker. |
| Exploration exists | Confirmed directionally | TikTok mentions diversity and content outside expressed interests. |
| Feed diversity/fatigue exists | Confirmed for TikTok | TikTok says it avoids repetitive patterns such as same sound/creator in sequence. |
| Expansion waves | Partially confirmed | Instagram Trial Reels strongly supports test-before-broader-distribution logic. |
| Plateaus always mean shadowban | Denied | Plateaus can mean failed expansion, eligibility cap, weak routing, saturation, or audience exhaustion. |
| Real-time learning | Confirmed in recommender research | ByteDance Monolith supports real-time short-video recommendation. |
| Recommendation is sequence prediction | Confirmed directionally by modern research | Meta HSTU supports sequence-based recommendation. |
| Saturation/competition affects reach | Confirmed conceptually | YouTube docs acknowledge topic interest, competition, seasonality, and shifting viewer behavior. |
| Post time determines long-term YouTube reach | Weak / mostly denied | YouTube says publish time may affect immediate views but not observed long-term viewership. |
| Follower count directly boosts TikTok FYP | Denied | TikTok says follower count is not a direct For You factor. |
| Hashtags/sounds determine reach | Partially confirmed but often overvalued | They help routing; behavior drives expansion. |

## Refined platform models

### TikTok

```text
TikTokBreakout =
σ(
  β1 · Retention × TopicFit
+ β2 · Stop × Retention
+ β3 · Share/Favorite/Comment
+ β4 · Exploration
+ β5 · TrendVelocity
- β6 · NegativeFeedback
- β7 · EligibilityRisk
)
```

Confidence:

```text
Signal classes: high
Interaction structure: medium
Exact coefficients: low
```

### Instagram Reels

```text
IG_ReelsBreakout =
σ(
  β1 · Retention × SendRate
+ β2 · SaveRate × TopicClarity
+ β3 · Originality
+ β4 · FollowRate
+ β5 · Relationship/CreatorTrust
- β6 · NegativeFeedback
- β7 · RepostPenalty
)
```

Confidence:

```text
Watch/saves/reshares/comments: high
Sends dominate likes: medium
Originality gate: medium-high
Exact coefficients: low
```

### YouTube Shorts

```text
YTShortsBreakout =
σ(
  β1 · ViewedVsSwiped × AveragePercentageViewed
+ β2 · Retention × SessionFit
+ β3 · SubscribeRate
+ β4 · LongTermSatisfaction
+ β5 · RemixPotential
- β6 · NegativeFeedback
)
```

Confidence:

```text
Viewed-vs-swiped: high
APV / retention: high
Session fit: medium-high
Exact coefficients: low
```

## Corrected master formula

```text
Reach_p(v) =
Eligibility_p(v)
· Σ_g Σ_k AudienceSize_{p,g,k}
· Π_{j=0}^{k}
Φ(
  (μ_{p,v,g,j} - θ_{p,g,j,t}) /
  sqrt(σ²_{p,v,g,j} + τ²_p)
)
```

with:

```text
μ = βᵀx + xᵀQx + MLP_residual(x)
```

and:

```text
x = [
  StopScore,
  DurationDebiasedRetention,
  Completion,
  Rewatch/Loop,
  ShareSend,
  SaveFavorite,
  Comment,
  FollowSubscribe,
  TopicFit,
  TopicClarity,
  Relationship,
  Originality,
  CreatorTrust,
  Exploration,
  Freshness,
  NegativeFeedback,
  CompetitionPressure
]
```



---

<!-- Source file: math/master_equations.md -->


# Master Equations

## 1. Expected utility ranking

For user `u`, video `v`, session `s`, platform `p`, and time `t`:

```text
U_p(u,v,s,t)
=
Σ_i α_{p,i} · P(positive_action_i | x)
+ Σ_j β_{p,j} · E(continuous_value_j | x)
- Σ_k λ_{p,k} · P(negative_action_k | x)
```

Final ranking:

```text
Rank_p(u,v,s,t)
=
Eligibility_p(v,c)
· Rerank_p(U_p, Diversity, Fatigue, Exploration)
```

## 2. Optimal ranking proof sketch

Let each video have expected utility `q_i` and slots have exposure weights:

```text
π_1 ≥ π_2 ≥ ... ≥ π_n
```

A ranking `σ` has value:

```text
U(σ) = Σ_r π_r · q_{σ(r)}
```

If lower-utility item `i` is above higher-utility item `j`:

```text
q_i < q_j
```

and slot `a` is above slot `b`:

```text
π_a ≥ π_b
```

Swapping them changes value by:

```text
U_new - U_old = (π_a - π_b)(q_j - q_i) ≥ 0
```

So ranking by descending expected utility is optimal under this exposure model.

## 3. Retention survival curve

Let:

```text
T = watch duration
L = video length
S(t) = P(T ≥ t)
```

Expected watch seconds:

```text
E[min(T,L)] = ∫_0^L S(t)dt
```

Average percentage viewed:

```text
APV = E[min(T,L)] / L
```

Completion:

```text
CompletionRate = S(L)
```

Loop value:

```text
LoopValue = E[max(T - L, 0)] / L
```

## 4. Baseline normalization

Simple log-ratio version:

```text
Z_m = tanh(ln((rate_m + ε) / (baseline_m + ε)))
```

Empirical-Bayes version:

```text
p̂_m = (x_m + ν_m · b_m) / (n_m + ν_m)
```

```text
Evidence_m = logit(p̂_m) - logit(b_m)
```

```text
EB_m = Evidence_m - ζ · SE_m
```

## 5. Duration-debiased watch score

```text
WatchQuantileScore = Φ^{-1}(F_{p,niche,L}(ObservedWatchTime))
```

where:

```text
F_{p,niche,L} = watch-time CDF for similar videos
```

## 6. Topic clarity

```text
TopicClarity(v) = 1 - H(TopicDistribution(v)) / log(K)
```

Alternative operational proxy:

```text
TopicClarity ≈ max_topic_probability - mean(other_topic_probabilities)
```

## 7. Posterior expansion probability

```text
P_expand(p,v,g,k,t) =
Φ(
  (μ_{p,v,g,k} - θ_{p,g,k,t}) /
  sqrt(σ²_{p,v,g,k} + τ²_p)
)
```

## 8. Threshold model

```text
θ_{p,g,k,t} =
θ_0
+ a · log(1+k)
+ b · AudienceDistance(g)
+ c · CompetitionPressure(topic,t)
- d · TrendBoost(v,t)
```

## 9. Expected reach

```text
ExpectedReach_p(v) =
Eligibility_p(v)
· Σ_g Σ_k
AudienceSize_{p,g,k}
· Π_{j=0}^{k} P_expand(p,v,g,j,t)
```

## 10. Nonlinear utility model

```text
μ_{p,v,g,k} = βᵀx + xᵀQx + MLP_residual(x)
```

Important interactions:

```text
Retention × TopicFit
Stop × Retention
WatchTime × ShareSend
Save × TopicClarity
ViewedVsSwiped × APV
Originality × CreatorTrust
NegativeFeedback × AudienceScale
```

## 11. Hypothesis weight update

```text
w_i(t+1) =
w_i(t) · exp(-η · Loss_i)
/
Σ_j w_j(t) · exp(-η · Loss_j)
```

Final prediction:

```text
FinalPrediction(v) = Σ_i w_i · ŷ_i(v)
```



---

<!-- Source file: hypotheses/hypothesis_register.md -->


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



---

<!-- Source file: hypotheses/platform_specific_hypotheses.md -->


# Platform-Specific Hypotheses

## TikTok

### Best current formula

```text
TikTokBreakout =
σ(
  1.35 · Retention · TopicFit
+ 0.90 · Stop · Retention
+ 0.70 · ShareFavorite · TopicClarity
+ 0.45 · CommentVelocity
+ 0.35 · TrendVelocity
+ 0.30 · Exploration
- 1.20 · NegativeFeedback
- 0.45 · Saturation
)
```

### Ranked TikTok hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | User interactions dominate weak context signals | Confirmed | High |
| 2 | Retention × TopicFit drives FYP expansion | Partially confirmed / inferred interaction | Medium-high |
| 3 | Full watch / watch time matters more than likes | Confirmed directionally | High |
| 4 | Favorites/shares/comments are stronger than likes | Partially confirmed | Medium |
| 5 | Exploration is strong because TikTok is interest-graph driven | Confirmed directionally | Medium-high |
| 6 | Trend velocity can temporarily reduce thresholds | Inferred | Medium |
| 7 | Follower count is indirect, not direct | Confirmed denial of direct factor | High |

### Model notes

```text
TikTok = interest graph + retention + exploration.
Follower count can help indirectly through initial audience and historical data, but not as a direct For You ranking factor.
```

---

## Instagram Reels

### Best current formula

```text
IGBreakout =
σ(
  1.25 · Retention · SendShare
+ 0.85 · Save · TopicClarity
+ 0.55 · Stop · Retention
+ 0.45 · Originality · CreatorTrust
+ 0.30 · FollowRate
- 1.20 · NegativeFeedback
- 0.65 · RepostPenalty
)
```

### Ranked Instagram hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | Watch time × sends drives unconnected reach | Partially confirmed / test | Medium |
| 2 | Saves indicate durable value | Confirmed as signal, weight unknown | Medium-high |
| 3 | Originality affects eligibility / expansion | Confirmed directionally | Medium-high |
| 4 | Relationship signals matter more than TikTok | Inferred / platform-consistent | Medium |
| 5 | Trial/non-follower testing reflects expansion waves | Confirmed for Trial Reels | High |
| 6 | Likes matter less than sends/saves for discovery | Test | Medium |
| 7 | Repost/watermark behavior suppresses distribution | Confirmed directionally | Medium |

### Model notes

```text
Instagram = interest graph + social graph + originality + non-follower tests.
```

---

## YouTube Shorts

### Best current formula

```text
YTShortsBreakout =
σ(
  1.30 · ViewedVsSwiped · AveragePercentageViewed
+ 0.85 · Retention · SessionFit
+ 0.55 · SubscribeRate
+ 0.45 · LongTermSatisfaction
+ 0.25 · RemixPotential
- 1.15 · NegativeFeedback
)
```

### Ranked YouTube Shorts hypotheses

| Rank | Hypothesis | Status | Confidence |
|---:|---|---|---:|
| 1 | Viewed-vs-swiped is the entry gate | Confirmed | High |
| 2 | APV and duration-debiased watch beat raw views | Confirmed directionally | High |
| 3 | Session continuation matters more than TikTok | Partially confirmed / inferred | Medium-high |
| 4 | Subscribe rate is stronger than like rate | Test | Medium |
| 5 | Satisfaction protects against watch-time gaming | Confirmed conceptually | High |
| 6 | Remixes indicate trend potential | Secondary | Medium-low |
| 7 | Negative feedback reduces future recommendations | Confirmed | High |

### Model notes

```text
YouTube Shorts = viewed-vs-swiped × average percentage viewed × session fit × satisfaction.
```



---

<!-- Source file: experiments/validation_plan.md -->


# Validation Plan

The goal is to test which hypotheses best predict reach using creator analytics.

## Target variables

Primary target:

```text
y = log(1 + NonFollowerReach_72h)
```

Secondary targets:

```text
log(1 + TotalReach_72h)
log(1 + NonFollowerReach_7d)
P(Breakout)
P(next_reach_band)
```

Reach bands:

```text
Band 0: < 500
Band 1: 500–2,000
Band 2: 2,000–10,000
Band 3: 10,000–50,000
Band 4: 50,000+
```

## Required data collection checkpoints

```text
15 minutes
1 hour
3 hours
12 hours
24 hours
72 hours
7 days
```

## Metrics to collect

```text
platform
post_time
topic
format
length_seconds
followers_at_post
impressions / shown_in_feed
views
engaged_views
viewed_vs_swiped_away
3s_hold
average_watch_time
average_percentage_viewed
completion_rate
rewatch_rate
likes
comments
shares / sends
saves / favorites
follows / subscribers
profile_visits
not_interested
hides
reports
dislikes
non_follower_reach
total_reach
```

## Experiment 1 — retention beats likes

Hypothesis:

```text
RetentionScore predicts 72h non-follower reach better than LikeRate.
```

Model A:

```text
log(1 + Reach_72h) ~ LikeRate
```

Model B:

```text
log(1 + Reach_72h) ~ RetentionScore
```

Expected:

```text
R²_B > R²_A
```

## Experiment 2 — Instagram sends/saves beat likes/comments

Hypothesis:

```text
SendRate + SaveRate predicts Instagram non-follower reach better than LikeRate + CommentRate.
```

Model:

```text
log(1 + NonFollowerReach_72h) ~ SendRate + SaveRate + LikeRate + CommentRate + RetentionScore
```

Expected:

```text
β_send + β_save > β_like + β_comment
```

## Experiment 3 — YouTube viewed-vs-swiped gate

Hypothesis:

```text
ViewedVsSwiped and APV interact multiplicatively.
```

Model:

```text
P(Breakout) = σ(β0 + β1 ViewedVsSwiped + β2 APV + β3 ViewedVsSwiped·APV)
```

Expected:

```text
β3 > 0
```

## Experiment 4 — duration-debiased watch beats raw watch seconds

Model A:

```text
Reach ~ AverageWatchSeconds
```

Model B:

```text
Reach ~ DurationDebiasedWatch
```

Expected:

```text
Model B has lower log loss and higher R².
```

## Experiment 5 — topic clarity improves routing

Hypothesis:

```text
Clear-topic videos break out more often than vague-topic videos after controlling for retention.
```

Model:

```text
P(Breakout) = σ(β0 + β1 Retention + β2 ShareSave + β3 TopicClarity)
```

Expected:

```text
β3 > 0
```

## Experiment 6 — negative feedback kills expansion probability

Model:

```text
P(next_band) = σ(β0 + β1 Retention + β2 ShareSave - β3 NegativeFeedback)
```

Expected:

```text
β3 > 0 as a penalty.
```

## Evaluation criteria

```text
R² on log(1 + reach)
AUC for breakout prediction
log loss
calibration curve
precision@top10%
month-by-month cross-validation
ablation performance loss
```

## Ablation tests

Remove one block at a time:

```text
remove retention
remove share/save
remove negative feedback
remove topic clarity
remove duration debiasing
remove nonlinear interactions
remove platform-specific terms
```

A hypothesis becomes stronger if removing it worsens out-of-sample prediction.



---

<!-- Source file: sources/references.md -->


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
