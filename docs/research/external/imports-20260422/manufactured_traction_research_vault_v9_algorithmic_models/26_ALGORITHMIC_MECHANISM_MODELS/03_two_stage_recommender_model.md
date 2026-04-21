# Two-Stage Recommender Model

## Public model basis
Large-scale recommenders often use a two-stage structure: candidate generation followed by ranking. The YouTube recommendation paper describes this high-level pattern: first retrieve a small candidate set from a massive corpus, then rank those candidates.

## Model
Let the platform have a huge corpus \(\mathcal{I}\). Candidate generation selects:

\[
C_u = \operatorname{TopM}_{i \in \mathcal{I}} h(u, i)
\]

Then ranking orders candidates by:

\[
R_u = \operatorname{TopK}_{i \in C_u} f(u, i, x_{i,t})
\]

where \(h\) is candidate retrieval and \(f\) is ranking.

## Manufactured traction entry points
Signal distortion can matter at either stage:

1. **Candidate-gate manipulation**: enough signal makes the item eligible for candidate generation.
2. **Rank-stage manipulation**: enough signal moves it higher after it is already a candidate.
3. **Personalization-match manipulation**: signals make the item appear relevant to particular user clusters.
4. **Safety/quality dampening**: platforms may discount or remove items despite engagement.

## Boundary theorem
If an item is below the candidate threshold, ranking quality does not matter because the item is never considered. Therefore, crossing the candidate-generation boundary can have discontinuous effects on exposure.
