# Bayesian Beta-Binomial Model

## Purpose

Use for click rates, signup rates, activation rates, and conversion rates when samples are small or decisions need uncertainty.

## Prior

```text
p ~ Beta(α, β)
```

## Likelihood

```text
y ~ Binomial(n, p)
```

## Posterior

After `y` successes in `n` trials:

```text
p | data ~ Beta(α + y, β + n − y)
```

## Default priors

| Situation | Prior |
|---|---|
| Unknown baseline | Beta(1, 1) |
| Weak prior centered at 5% | Beta(5, 95) |
| Prior CTR around 1% | Beta(1, 99) |
| Prior conversion around 10% | Beta(10, 90) |

## Decision

For variant A and B:

```text
P(p_B > p_A)
```

Scale B only when:

```text
P(p_B > p_A) > threshold
```

Example thresholds:

| Decision | Threshold |
|---|---|
| Explore more | 0.60 |
| Shift small budget | 0.75 |
| Replace variant | 0.90 |
| Scale hard | 0.95 plus economics pass |

## Markdown record

```text
variant
trials
successes
prior_alpha
prior_beta
posterior_alpha
posterior_beta
posterior_mean
probability_best
decision
```
