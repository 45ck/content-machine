# Theorem 05 — Profile Injection in a Linear Recommender

## Claim
If a recommender uses a weighted aggregate of user ratings, injected fake profiles can change the target item's score in proportion to their weight and rating extremity.

## Setup
Let item `i` have recommendation score:

\[
\hat r_i = \frac{\sum_{u \in U} w_u r_{ui}}{\sum_{u \in U} w_u}
\]

An attacker injects `m` profiles with rating `r_A` and total weight `W_A`. The new score is:

\[
\hat r'_i = \frac{W\hat r_i + W_A r_A}{W + W_A}
\]

The score shift is:

\[
\hat r'_i - \hat r_i = \frac{W_A}{W + W_A}(r_A - \hat r_i)
\]

## Result
If `r_A > \hat r_i`, the target item is pushed upward. If `r_A < \hat r_i`, it is pushed downward. The shift grows with attacker weight and rating extremity.

## Evidence
The shilling-attack literature treats profile injection as a known vulnerability of collaborative filtering systems. Studies define push and nuke attacks and report that fake profiles can bias recommender outputs.

## Limitation
Modern recommenders are more complex and include defences. The theorem proves the mechanism for a transparent weighted-average family, not guaranteed impact against defended systems.
