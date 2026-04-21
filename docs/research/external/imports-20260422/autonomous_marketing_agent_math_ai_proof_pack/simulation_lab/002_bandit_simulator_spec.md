# Bandit Simulator Spec

## Purpose

Compare equal split vs Thompson Sampling for creative variants.

## Inputs

```text
true_conversion_rates
traffic_per_batch
number_of_batches
prior
reward
```

## Outputs

```text
cumulative_reward
regret
winner_identification_accuracy
traffic_allocation
```

## Use

Before running bandits, simulate whether expected traffic is enough to learn.
