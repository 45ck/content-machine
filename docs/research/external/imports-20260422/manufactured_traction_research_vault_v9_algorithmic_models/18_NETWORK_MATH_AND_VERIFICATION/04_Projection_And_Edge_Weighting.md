# Projection and Edge Weighting

Projection converts a bipartite graph into an actor-to-actor or content-to-content graph.

## Actor projection

Accounts `i` and `j` are connected if they share one or more objects.

Raw weight:

`w_ij = |N(i) ∩ N(j)|`

Where `N(i)` is the set of objects touched by account `i`.

## Time-aware projection

Only count an overlap if it happened close in time:

`w_ij = Σ_c 1[|t_ic - t_jc| ≤ Δ]`

This is stronger than content overlap alone.

## Similarity-normalized projection

Raw overlap can overstate large accounts. Normalize with Jaccard similarity:

`J(i,j) = |N(i) ∩ N(j)| / |N(i) ∪ N(j)|`

Or cosine similarity:

`cos(i,j) = x_i · x_j / (||x_i|| ||x_j||)`

Where `x_i` is a vector of account actions across content items.

## Edge weighting choice

| Weight type | Best for | Weakness |
|---|---|---|
| Raw count | simple repeated coordination | favors high-volume accounts |
| Jaccard | shared niche behaviour | penalizes high-volume accounts |
| Cosine | action-vector similarity | can hide timing |
| Time-aware count | synchronized campaigns | depends on time-window choice |
| Multi-behaviour weight | complex campaigns | requires careful interpretation |

## Practical rule

Use at least two weights:

1. raw repeated co-actions for detection
2. normalized similarity for robustness
