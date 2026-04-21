# Autonomous Marketing State Space Model

## Purpose

Use this model to stop treating marketing as copywriting and start treating it as a controlled system.

## State

At time `t`, the campaign state is:

```text
S_t = {
  buyer_state_distribution,
  channel_state,
  creative_state,
  offer_state,
  proof_state,
  landing_page_state,
  measurement_state,
  budget_state,
  memory_state
}
```

## Action

```text
A_t = {
  research_more,
  generate_variant,
  launch_test,
  shift_budget,
  pause_variant,
  refresh_creative,
  change_offer,
  change_landing_page,
  run_lift_test,
  update_memory
}
```

## Observation

```text
O_t = {
  impressions,
  clicks,
  cost,
  landing_events,
  signups,
  activations,
  purchases,
  revenue,
  comments,
  reviews,
  competitor_changes,
  platform_quality_signals
}
```

## Reward

```text
R_t = profit_t + learning_value_t − risk_cost_t − opportunity_cost_t
```

## Transition

```text
P(S_{t+1} | S_t, A_t, O_t)
```

The agent does not need to know the true transition law. It estimates it through observations and Bayesian updates.

## Decision rule

```text
A_t^* = argmax_A E[R_t + gamma V(S_{t+1}) | S_t, A]
```

For practical execution, approximate this with:

```text
expected_action_value =
expected_incremental_profit
+ expected_learning_value
- expected_cost
- downside_risk
```

## Markdown record

Every campaign folder should maintain:

```text
state_summary.md
actions_taken.md
observations.md
belief_updates.md
next_action_decision.md
```

## Agent instruction

Never say "the campaign worked" or "failed" without naming the state that changed.
