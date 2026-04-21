# Causal Inference and Difference-in-Differences

Network evidence can show coordination. It does not automatically show impact.

To estimate impact, use causal designs where possible.

## Difference-in-differences

Compare a treated object to a similar untreated object before and after a campaign window.

`effect = (Y_treated_after - Y_treated_before) - (Y_control_after - Y_control_before)`

Examples:

- song exposed to clipping campaign vs similar song not exposed
- app with suspected review burst vs similar app
- launch with vote campaign vs launch without campaign
- product with fake review burst vs similar product

## Outcome variables

- search interest
- installs
- streams
- sales
- follower growth
- website traffic
- conversion rate
- retention quality
- downstream engagement diversity

## Requirements

- clear intervention window
- comparable control
- enough pre-period data
- enough post-period data
- no simultaneous major confounder

## Caution

Do not claim causality from correlation. Use language such as "consistent with", "associated with", or "estimated effect under assumptions."
