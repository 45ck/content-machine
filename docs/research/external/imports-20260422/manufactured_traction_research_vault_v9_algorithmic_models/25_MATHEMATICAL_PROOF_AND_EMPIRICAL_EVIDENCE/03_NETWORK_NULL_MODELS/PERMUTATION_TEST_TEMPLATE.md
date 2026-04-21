# Permutation Test Template

## Hypothesis

Observed coordination is higher than expected under independent timing/content assignment.

## Test statistic options

- max edge weight
- number of edges above threshold `r`
- largest component size
- modularity
- cluster density
- mean pairwise similarity
- burst z-score

## Procedure

1. Compute observed statistic `T_obs`.
2. Generate `B` null datasets by shuffling timestamps or account labels while preserving constraints.
3. Compute `T_b` for each null dataset.
4. Empirical p-value:

```text
p = (1 + Σ I(T_b >= T_obs)) / (B + 1)
```

5. Report effect size:

```text
z = (T_obs - mean(T_null)) / sd(T_null)
```
