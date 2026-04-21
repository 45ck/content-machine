# Formula index

## Funnel

```text
Meaningful actions = E × CTV × EHR × weighted downstream value
```

## Utility

```text
U_v = Σ_m w_m × z_m(v) - Σ_g λ_g × penalty_g(v)
```

## Beta posterior

```text
θ | data ~ Beta(α0 + x, β0 + n - x)
```

## Sample size for two proportions

```text
n ≈ 2 × p̄(1 - p̄) × (z_{1-α/2} + z_{1-β})² / Δ²
```

## Scale decision

```text
Scale if P(U_v > U_baseline + δ) ≥ 0.85 and guardrails pass.
```

## Thompson sampling

```text
sample θ̃_k from each arm posterior
choose arm with max θ̃_k
update posterior after observing reward
```

## Guardrail rule

```text
primary win + trust failure = kill/rewrite, not scale
```
