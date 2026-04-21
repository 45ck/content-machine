# LTV, CAC, and Payback Model

## Purpose

Prevent scaling campaigns that generate cheap but low-quality users.

## SaaS LTV

```text
LTV = ARPA × gross_margin / monthly_churn_rate
```

## CAC

```text
CAC = marketing_spend / new_customers
```

## Payback

```text
payback_months = CAC / (ARPA × gross_margin)
```

## Contribution-adjusted LTV

```text
LTV_contribution = expected_revenue × gross_margin − servicing_cost − support_cost
```

## Scale condition

```text
LTV / CAC > threshold
payback_months < threshold
activation quality acceptable
```

## Agent rule

Do not optimize for signup CAC unless paid conversion and retention quality are tracked.
