# Link Graph Spam Proof

## Claim

If search ranking uses link structure as an authority signal, artificial link structures can change authority scores.

## Generic PageRank-like setup

Page importance is recursively influenced by incoming links:

```text
PR(i) = base + d * Σ_{j linking to i} PR(j) / outdegree(j)
```

Adding artificial pages and links changes the graph adjacency matrix, which changes the stationary ranking vector.

## Interpretation

Link farms are graph perturbations. They try to change authority without changing underlying usefulness.

## Literature support

Wu and Davison describe link farms as a technique that can deteriorate link-based ranking algorithms and propose automatic detection using graph structure.
