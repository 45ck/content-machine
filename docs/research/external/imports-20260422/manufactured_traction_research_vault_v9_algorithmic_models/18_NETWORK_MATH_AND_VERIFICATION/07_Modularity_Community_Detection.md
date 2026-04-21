# Modularity and Community Detection

Community detection finds clusters of accounts that coordinate more with each other than with outsiders.

## Modularity intuition

A network has high modularity when there are many edges inside communities and fewer edges between communities than expected under a null model.

Simplified:

`Q = observed within-community edge density - expected within-community edge density`

Higher `Q` suggests clearer community structure.

## Louvain method

The Louvain method is a fast modularity-optimization algorithm commonly used for large networks. It starts with each node in its own community, moves nodes to improve modularity, collapses communities into supernodes, and repeats.

## Use in manufactured-traction research

Community detection helps identify:

- a clipper pod
- a review ring
- a Reddit seeding cluster
- a launch upvote group
- a network of impersonation pages
- a group of accounts pushing the same campaign objects

## Interpretation guide

| Pattern | Possible meaning |
|---|---|
| One dense cluster | centralized campaign or tightly coordinated pod |
| Several dense clusters | multiple campaign teams or subcommunities |
| High central bridge nodes | agency, hub account, repost coordinator, broker |
| Sparse network | weak evidence of coordination |

## Limits

Modularity is descriptive. It does not prove intent. Use it as a map that guides closer evidence review.
