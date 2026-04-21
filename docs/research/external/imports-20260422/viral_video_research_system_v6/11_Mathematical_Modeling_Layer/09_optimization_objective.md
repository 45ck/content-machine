# Optimisation objective

## Problem

Maximising views alone produces bad strategy.

## Multi-objective utility

Define:

```text
U = w1×CTV + w2×EHR + w3×APV + w4×CPL + w5×SAV + w6×SND + w7×FOL + w8×SEA - penalties
```

All metrics should be normalised against baseline:

```text
z_m(v) = (metric_m(v) - baseline_mean_m) / baseline_sd_m
```

## Strategic objective profiles

### Growth / audience-building

```text
FOL high weight
SAV/SND moderate
CTV/APV required guardrails
```

### Education / authority

```text
SAV high
FOL high
TRU guardrail strict
```

### Social spread / Reels

```text
SND high
CMT moderate
FOL/SAV guardrails
```

### Search / long-tail

```text
SEA high
SAV high
FOL moderate
24h views lower priority
```

### Revenue / product

```text
CLK/REV high
TRU strict
FOL optional
```

## Avoid Goodhart failure

If a metric becomes the sole target, it can be gamed.

Guardrails:

```text
High CTV must not collapse completion.
High comments must not be rage-only.
High views must not destroy follow conversion.
High shares must not come from misleading claims.
High saves must not be disconnected from account promise.
```
