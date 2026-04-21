# Response Surface and Budget Allocation

## Purpose

Allocate budget across campaigns/channels based on marginal returns.

## Channel response

```text
sales_j = β_j × f_j(spend_j)
```

Budget constraint:

```text
Σ_j spend_j ≤ B
```

Optimization:

```text
maximize Σ_j profit_j(spend_j)
subject to spend_j ≥ 0
```

## Marginal rule

Shift budget until:

```text
mROAS_j ≈ required_return
```

for active channels.

## Practical rule

Increase spend on a campaign only when:

```text
marginal expected profit > 0
and
uncertainty is acceptable
and
quality signals are not degrading
```
