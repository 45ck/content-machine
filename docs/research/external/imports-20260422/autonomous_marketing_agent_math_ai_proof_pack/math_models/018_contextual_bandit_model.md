# Contextual Bandit Model

## Purpose

Different audiences respond to different ads. A contextual bandit learns which variant works in which context.

## Model

At time `t`:

```text
context x_t
choose action a_t
observe reward r_t
learn P(r | x, a)
```

## Context examples

```text
buyer_state
search_query_cluster
industry
company_size
device
geo
time
retargeting_depth
prior_page_views
```

## Reward examples

```text
click
qualified_signup
activation
revenue
profit
```

## Decision

```text
a_t = argmax_a E[r | x_t, a] + exploration_bonus
```

## Use

Use when the same campaign serves heterogeneous buyers.

## Markdown output

```text
context_segment
best_variant
posterior_expected_reward
uncertainty
next_exploration_action
```
