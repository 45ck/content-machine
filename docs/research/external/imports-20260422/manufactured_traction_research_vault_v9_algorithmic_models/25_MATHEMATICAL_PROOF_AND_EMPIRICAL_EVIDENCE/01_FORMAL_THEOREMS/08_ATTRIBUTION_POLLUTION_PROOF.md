# Attribution Pollution Proof

## Claim

If budget is allocated by measured conversions, fake or stolen conversions can redirect future budget.

## Model

```text
B_c(t+1) = B_total * M_c(t) / Σ_j M_j(t)
M_c = T_c + F_c
```

Where `T_c` is true conversions and `F_c` is fake or stolen attribution.

If `F_c > 0`, channel `c` receives more budget than justified by true contribution.

## Interpretation

This is the mathematical core of fake leads, click flooding, install hijacking, postback fraud, and affiliate attribution theft.
