# Bayesian Bandit Allocation

Bandits are useful when the agent needs to allocate traffic while learning.

## Use bandits when

- many creative variants exist,
- traffic is limited,
- you want to reduce waste on weak variants,
- the goal is operational optimization,
- variant performance can be measured quickly.

## Do not use bandits when

- you need clean causal inference,
- conversion lag is long,
- data quality is weak,
- variants affect different buyer states,
- you need a simple executive answer.

Bandits optimize allocation. They do not prove incrementality.
