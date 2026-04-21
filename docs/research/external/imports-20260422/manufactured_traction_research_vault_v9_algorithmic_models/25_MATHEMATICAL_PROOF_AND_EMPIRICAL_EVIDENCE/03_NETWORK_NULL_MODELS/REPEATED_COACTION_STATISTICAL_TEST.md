# Repeated Co-Action Statistical Test

## Goal

Determine whether observed repeated same-action behaviour is more consistent with independent activity or coordinated activity.

## Edge construction

Create an edge between accounts `u` and `v` when they perform the same action on the same object within time window `t`.

```text
w_uv = number of repeated co-actions within t
```

Keep edges only when:

```text
w_uv >= r
```

## Null model

Use timestamp shuffling or account-label permutation:

1. Preserve each account's total posting rate.
2. Preserve each object's popularity.
3. Randomize event timing or account-object assignment.
4. Recompute edge weights.
5. Compare observed `w_uv` to the null distribution.

## Empirical p-value

```text
p = (1 + count(w_null >= w_observed)) / (1 + number_of_null_runs)
```

## Interpretation

Low p-values and dense clusters imply the observed pattern is unlikely under the tested independence model. That is not the same as proving payment or intent.
