# Math Cheat Sheet

## Edge weight

`w_ij = Σ_c 1[|t_ic - t_jc| ≤ Δ]`

## Jaccard similarity

`J(i,j) = |N(i) ∩ N(j)| / |N(i) ∪ N(j)|`

## Cosine similarity

`cos(i,j) = (x_i · x_j) / (||x_i|| ||x_j||)`

## Density

For undirected graph:

`D = 2m / (n(n-1))`

Where `m` is edges and `n` is nodes.

## Weighted degree

`strength(i) = Σ_j w_ij`

## Burst z-score

`z_t = (x_t - μ) / σ`

## Entropy

`H = -Σ p_i log(p_i)`

## Normalized entropy

`H_norm = H / log(k)`

## Empirical p-value

`p = (1 + #null_stats ≥ observed_stat) / (1 + simulations)`

## Difference-in-differences

`DiD = (Y_T,after - Y_T,before) - (Y_C,after - Y_C,before)`

## Evidence principle

One metric is a clue. Multiple independent metrics are evidence.
