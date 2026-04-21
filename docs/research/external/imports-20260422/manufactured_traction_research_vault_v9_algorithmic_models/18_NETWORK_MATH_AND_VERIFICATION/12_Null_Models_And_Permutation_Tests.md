# Null Models and Permutation Tests

A null model asks:

> How unusual is this pattern compared with a world where behaviour is independent or randomly timed?

## Basic permutation test

1. Keep the same accounts and content.
2. Randomly shuffle timestamps within a reasonable observation window.
3. Rebuild the coordination graph.
4. Record a statistic, such as maximum edge weight or graph density.
5. Repeat many times.
6. Compare the observed statistic to the random distribution.

## Empirical p-value

`p = (1 + number of null statistics ≥ observed statistic) / (1 + number of simulations)`

Small `p` means the observed pattern is unusual under the chosen null model.

## Useful statistics

- maximum edge weight
- number of edges above threshold
- size of largest connected component
- modularity
- density
- maximum burst z-score
- number of repeated co-actions
- community concentration

## Why this matters

Without a null model, a researcher may mistake normal platform behaviour for manipulation. With a null model, the claim becomes: "This coordination is stronger than expected under this baseline."

## Caveat

Null models are assumptions, not truth. Always state what was preserved and what was randomized.
