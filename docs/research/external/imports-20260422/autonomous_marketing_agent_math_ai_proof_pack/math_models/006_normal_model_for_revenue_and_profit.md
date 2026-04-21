# Normal and Lognormal Revenue Model

## Purpose

Binary conversion is not enough when customers have different revenue values.

## Revenue per conversion

If revenue is approximately symmetric:

```text
r_i ~ Normal(μ, σ²)
```

If revenue is skewed:

```text
log(r_i) ~ Normal(μ, σ²)
```

## Profit per click

```text
profit_per_click =
P(conversion | click) × E[gross_profit | conversion] − cost_per_click
```

## Profit posterior

Track uncertainty in:

```text
conversion_rate
gross_profit_per_conversion
cost_per_click
```

Then simulate expected profit:

```text
for sample in posterior:
  profit = cr_sample × gp_sample × clicks − cpc_sample × clicks
```

## Decision

Scale only if:

```text
P(profit > 0) > 0.90
```

or if the campaign's explicit purpose is learning.

## Use

Use for SaaS when ACV varies by segment or conversion quality varies by channel.
