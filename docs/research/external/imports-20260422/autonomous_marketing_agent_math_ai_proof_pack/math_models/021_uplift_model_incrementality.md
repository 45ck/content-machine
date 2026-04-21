# Uplift Model for Incrementality

## Purpose

Find buyers who change behavior because of the campaign.

Traditional response model:

```text
P(Y=1 | X)
```

Uplift model:

```text
τ(X) = E[Y(1) − Y(0) | X]
```

## Segment types

| Segment | Behavior |
|---|---|
| Persuadables | buy only if treated |
| Sure things | buy either way |
| Lost causes | do not buy either way |
| Sleeping dogs | less likely to buy if treated |

## Use

Use for retargeting, email, discounts, and promotions.

## Warning

Targeting likely responders can waste money on sure things. Target incremental responders.
