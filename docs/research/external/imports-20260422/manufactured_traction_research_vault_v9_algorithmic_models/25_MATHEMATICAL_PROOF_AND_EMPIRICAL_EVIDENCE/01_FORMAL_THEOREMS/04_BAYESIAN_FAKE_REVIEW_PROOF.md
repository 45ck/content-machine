# Bayesian Fake Review Proof

## Claim

If consumers update beliefs from reviews, fake positive reviews can move posterior belief across a purchase threshold.

## Model

Prior quality belief:

```text
q ~ Normal(μ0, σ0²)
```

Review signals:

```text
r_k = q + ε_k
```

After `n` reviews with mean `rbar`, posterior mean is:

```text
μ_n = (μ0/σ0² + n*rbar/σ²) / (1/σ0² + n/σ²)
```

If `f` fake positive reviews with value `r_f` are added:

```text
rbar' = (n*rbar + f*r_f) / (n + f)
```

If `r_f > rbar`, posterior mean rises. Behaviour changes when:

```text
μ_n < purchase_threshold < μ'_{n+f}
```

## Empirical support

Akesson et al. provide incentive-compatible experimental evidence that fake positive reviews caused consumers to choose lower-quality products and reduced welfare.
