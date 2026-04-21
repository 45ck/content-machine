# Saturation and Hill Response Model

## Purpose

More spend usually produces diminishing returns.

## Hill function

```text
f(x) = x^s / (x^s + k^s)
```

Where:

```text
x = adstocked spend or exposure
s = slope
k = half-saturation point
```

## Revenue contribution

```text
contribution = β × f(adstock(spend))
```

## Marginal return

```text
mROAS = d(contribution) / d(spend)
```

## Decision

Scale while:

```text
mROAS > required_return
```

Stop or shift budget when:

```text
mROAS ≤ required_return
```

## Use

Use for budget allocation and channel scaling.
