# Beta-Binomial CTR/CVR Model Card

## Purpose

State exactly what decision this model supports.

## Inputs

| Input | Required | Notes |
|---|---|---|
| metric | yes | primary decision metric |
| sample size | yes | number of trials/users/clicks |
| cost | usually | required for profit decisions |
| revenue quality | sometimes | required for scaling |
| segment | sometimes | needed for heterogeneity |

## Output

```text
posterior estimate
uncertainty
recommended action
assumptions
failure modes
```

## Decision threshold

Write the threshold before seeing results.

## Failure modes

- poor data quality,
- tiny sample,
- wrong metric,
- proxy optimization,
- nonstationarity,
- attribution bias.

## Markdown record

```text
model_used:
decision:
inputs:
outputs:
uncertainty:
action:
```
