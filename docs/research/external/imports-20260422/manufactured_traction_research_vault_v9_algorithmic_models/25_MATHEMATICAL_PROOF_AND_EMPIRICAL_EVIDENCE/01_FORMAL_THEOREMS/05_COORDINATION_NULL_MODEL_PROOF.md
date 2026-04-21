# Coordination Null Model Proof

## Claim

Repeated synchronized same-action behaviour can become statistically unlikely under independence.

## Model

Let `C` be repeated co-actions between accounts A and B on the same object within window `w`.

Under sparse independent activity:

```text
C ~ Poisson(λ)
```

The probability of at least `c` co-actions is:

```text
P(C >= c | independence) = 1 - F(c-1; λ)
```

Practical tests use timestamp shuffling or account-label permutation to preserve posting rates and object popularity.

## Result

If observed co-actions are far above the null distribution, independence is less plausible than coordination.

## Important limitation

This proves anomaly, not intent. Coordinated fandom, journalism, activism, or public campaigns can be authentic. Add disclosure, actor history, content similarity, and payment evidence before stronger claims.
