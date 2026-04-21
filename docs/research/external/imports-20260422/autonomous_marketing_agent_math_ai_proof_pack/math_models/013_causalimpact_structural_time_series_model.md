# CausalImpact Structural Time Series Model

## Purpose

Estimate campaign impact by predicting the counterfactual time series that would have happened without the intervention.

## Model intuition

```text
observed_post − predicted_counterfactual_post = causal_impact
```

## Inputs

```text
response_time_series
control_time_series
intervention_start
intervention_end
```

## Outputs

```text
pointwise_effect
cumulative_effect
credible_interval
posterior_probability_of_effect
```

## Use

Use when you have a strong pre-period and control series but no randomized experiment.

## Warning

Control series must not be affected by the campaign.
