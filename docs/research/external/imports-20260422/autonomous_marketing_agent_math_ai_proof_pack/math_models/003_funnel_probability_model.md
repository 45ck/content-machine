# Funnel Probability Model

## Purpose

Break a campaign into inspectable probabilities.

## Formula

```text
P(paid) =
P(attention)
× P(click | attention)
× P(inspect | click)
× P(signup | inspect)
× P(activate | signup)
× P(pay | activate)
```

Expected paid conversions:

```text
E[paid] = impressions × product_of_stage_probabilities
```

Expected profit:

```text
E[profit] = E[paid] × gross_profit_per_paid_user − spend − fixed_cost
```

## Use

Use this model when a campaign has weak performance and the agent must find where the break occurred.

## Diagnostic table

| Broken metric | Likely problem | Next experiment |
|---|---|---|
| Low impressions | audience, budget, platform eligibility | channel or targeting test |
| Low CTR | attention, relevance, creative | angle/creative test |
| Low LP engagement | expectation mismatch | landing proof path test |
| Low signup | offer or friction | form/trial/risk reversal test |
| Low activation | product onboarding | activation workflow test |
| Low pay | value, pricing, trust | pricing/proof/ROI test |

## Markdown output

```text
stage
observed_rate
expected_rate
confidence
diagnosis
next_test
```
