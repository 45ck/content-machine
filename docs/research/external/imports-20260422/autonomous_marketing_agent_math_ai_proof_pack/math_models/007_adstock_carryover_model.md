# Adstock Carryover Model

## Purpose

Ads often affect behavior after exposure. Adstock models carryover.

## Geometric adstock

```text
x*_t = x_t + λ x*_{t-1}
```

Where:

```text
x_t = spend or impressions at time t
λ = carryover rate between 0 and 1
```

## Interpretation

| λ | Meaning |
|---|---|
| 0 | no carryover |
| 0.2 | fast decay |
| 0.5 | moderate decay |
| 0.8 | strong carryover |

## Use

Use when response continues after campaign spend changes.

## In MMM

```text
sales_t = baseline_t + β × adstock(spend_t) + ε_t
```

## Warning

Adstock can create false confidence if you do not control for seasonality, trend, competitor events, pricing, and product changes.
