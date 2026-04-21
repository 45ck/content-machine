# Simulation protocol

## Purpose

Before spending production time, simulate expected outcomes from assumptions.

## Inputs

```text
number of variants
expected exposure per variant
baseline metric rates
minimum detectable effect
strategic weights
guardrail thresholds
prior strength
```

## Simulation steps

```text
1. Draw true metric rates from assumed distributions.
2. Simulate views/actions using binomial or count models.
3. Update posteriors.
4. Apply decision rules.
5. Estimate probability of correct scale/kill decision.
6. Repeat many times.
```

## Outputs

```text
probability of finding a winner
probability of false scale
probability of false kill
expected number of posts to identify mechanism
expected exposure needed
```

## Use

Run simulation before a major batch:

```text
If false scale risk is high → increase replication.
If false kill risk is high → raise sample size or use softer rewrite rules.
If probability of learning is low → simplify test design.
```
