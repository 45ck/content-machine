# Risk-Adjusted Profit Utility Model

## Purpose

Choose campaign actions by utility, not isolated metrics.

## Utility

```text
U(action) =
E[incremental_profit]
+ λ_learning × E[information_gain]
− λ_risk × downside_risk
− λ_cost × execution_cost
```

## Information value

Learning matters when it changes future action.

```text
EVI = E[max_a E[profit | new_data, a]] − max_a E[profit | current_data, a]
```

## Decision

Choose the action with highest positive expected utility.

## Practical shortcut

If no action has positive expected utility, run the cheapest diagnostic that reduces the biggest uncertainty.
