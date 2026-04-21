# Synthetic Funnel Simulator Spec

## Purpose

Test campaign decision logic before spending.

## Inputs

```text
impressions
p_attention
p_click
p_inspect
p_signup
p_activate
p_pay
gross_profit
spend
```

## Process

```text
simulate each stage as binomial draw
simulate revenue
compute profit
repeat many times
estimate probability of profit
```

## Output

```text
expected_paid
expected_profit
P(profit > 0)
credible interval
failure_stage_distribution
```
