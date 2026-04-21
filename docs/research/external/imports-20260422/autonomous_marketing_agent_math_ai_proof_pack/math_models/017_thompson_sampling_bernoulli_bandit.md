# Thompson Sampling for Bernoulli Bandits

## Purpose

Allocate impressions between ad variants while learning and earning.

## For each variant `k`

```text
p_k ~ Beta(α_k, β_k)
```

At each decision:

```text
sample θ_k ~ Beta(α_k, β_k)
choose argmax_k θ_k
observe success/failure
update α_k or β_k
```

## Update

Success:

```text
α_k ← α_k + 1
```

Failure:

```text
β_k ← β_k + 1
```

## Use

Use when:

- many creative variants,
- objective is CTR, signup, or activation,
- opportunity cost of equal allocation is high,
- formal clean A/B inference is less important than performance.

## Do not use

Do not use when:

- you need unbiased final comparison without adjustment,
- variant interference is high,
- nonstationarity is not handled,
- conversion event is too delayed.

## Agent rule

Bandits optimize known metrics. They do not prove long-term profit unless the reward is correctly defined.
