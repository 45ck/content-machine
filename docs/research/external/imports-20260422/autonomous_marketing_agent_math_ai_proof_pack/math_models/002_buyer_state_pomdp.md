# Buyer State POMDP

## Purpose

Buyer intent is hidden. Ads expose observations, not the actual mental state.

Model the buyer as a partially observable Markov decision process.

## Hidden states

```text
U0 = unaware
U1 = problem-aware
U2 = solution-aware
U3 = vendor-aware
U4 = evaluating
U5 = trialing
U6 = activated
U7 = paid
U8 = churn-risk
```

## Observations

```text
search_query
page_visit
scroll_depth
pricing_view
docs_view
integration_page_view
demo_watch
trial_signup
support_question
review_site_visit
competitor_comparison_visit
```

## Belief state

```text
b_t(s) = P(buyer_state = s | observations up to t)
```

## Update

```text
b_{t+1}(s') ∝ P(o_{t+1} | s') × Σ_s P(s' | s, action_t) b_t(s)
```

## Tactic mapping

| Belief concentration | Best tactic family |
|---|---|
| Unaware | market shift, hidden cost, story, founder POV |
| Problem-aware | pain articulation, diagnostic, calculator |
| Solution-aware | mechanism explanation, use-case demo |
| Vendor-aware | proof stack, comparisons, reviews |
| Evaluating | pricing clarity, security, implementation proof |
| Trialing | activation prompts, quick win, onboarding |
| Paid | expansion, retention, referral, case study |

## Foolproofing rule

Do not run vendor-aware tactics at unaware buyers unless the objective is pure retargeting.
