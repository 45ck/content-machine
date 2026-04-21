# Geo Lift Model

## Purpose

Estimate incremental effect by exposing some regions and holding out comparable regions.

## Setup

```text
treatment_geos = regions receiving campaign
control_geos = comparable regions not receiving campaign
pre_period = baseline
post_period = campaign period
```

## Simple estimator

```text
lift = (Y_treat_post − Y_treat_pre) − (Y_control_post − Y_control_pre)
```

## Normalized estimator

```text
lift_ratio =
(Y_treat_post / Y_treat_pre) − (Y_control_post / Y_control_pre)
```

## Use

Use when platform lift tools are unavailable or when campaign exposure can be geographically controlled.

## Requirements

- stable geo definitions,
- enough baseline history,
- low spillover,
- comparable controls,
- no major geo-specific shocks.
