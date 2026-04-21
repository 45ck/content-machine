# Metric models

## Binary metrics

Use Beta-Binomial models for rates:

```text
CTV = viewed / shown
EHR = held_3s / viewed
CPL = completed / viewed
SAV = saves / viewed
SND = sends / viewed
CMT = comments / viewed
FOL = follows / viewed
```

Posterior:

```text
θ_m ~ Beta(α0, β0)
x_m | n_m, θ_m ~ Binomial(n_m, θ_m)
θ_m | data ~ Beta(α0 + x_m, β0 + n_m - x_m)
```

Default weak prior:

```text
α0 = 1
β0 = 1
```

Baseline-informed prior:

```text
α0 = μ_baseline × κ
β0 = (1 - μ_baseline) × κ
```

Where `κ` controls prior strength.

## Continuous metrics

For average percentage viewed or average view duration:

```text
APV_v ~ Normal(μ_v, σ_v² / n)
```

Use bootstrap or robust quantiles if distributions are skewed.

## Count metrics

For comments or shares per exposure, when rare:

```text
x_v ~ Poisson(λ_v × exposure_v)
```

or use Negative Binomial if overdispersed.

## Guardrail metrics

Guardrails are not optional. Model them separately:

```text
negative_comment_rate
hide/not-interested rate if available
misleading-hook complaints
low completion despite high start rate
low follow conversion after clickbait
```

Decision rule:

```text
A video cannot scale if a trust guardrail fails, even if views are high.
```
