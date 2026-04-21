# Unit Economics Guardrail Model

## Purpose

Make the system aggressive without being economically stupid.

## Required fields

```text
spend
clicks
signups
activations
paid_customers
revenue
gross_margin
support_cost
refunds
churn
```

## Guardrails

```text
max_CAC = acceptable_CAC
min_LTV_CAC = 3.0
max_payback_months = target
min_activation_rate = target
```

## Decision table

| Condition | Action |
|---|---|
| CAC good, activation bad | fix onboarding before scaling |
| CAC bad, activation good | improve targeting/creative/offer |
| CAC good, LTV bad | inspect customer quality |
| LTV/CAC strong | scale with marginal-return checks |
