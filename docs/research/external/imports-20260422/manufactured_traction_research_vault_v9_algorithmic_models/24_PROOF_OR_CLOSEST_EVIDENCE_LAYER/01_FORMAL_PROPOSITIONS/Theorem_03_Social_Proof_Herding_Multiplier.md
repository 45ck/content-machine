# Theorem 03 — Social Proof Herding Multiplier

## Claim
If visible prior approval increases the probability of later approval, then even a small artificial initial signal can create a measurable herding effect.

## Setup
Let baseline probability of a positive action be `p`. Let visible social proof `v` shift the probability by `h(v)`.

\[
P(positive \mid v) = p + h(v)
\]

If a fake or artificial initial vote creates `v=1`, and `h(1)>0`, then expected positive actions among `n` future viewers increase by:

\[
\Delta = n h(1)
\]

If each positive action becomes visible and increases `v`, the system becomes recursive:

\[
P_{t+1} = p + h(V_t)
\]

where `V_t` is accumulated visible approval.

## Evidence
Muchnik, Aral, and Taylor ran a randomized experiment on a social news aggregation site: an initial positive manipulation increased the likelihood of a positive rating by 32% and increased final ratings by 25% on average. Salganik, Dodds, and Watts showed that visibility of others' choices in an artificial music market increased inequality and unpredictability of success.

## Interpretation
The proof does not require bots or fake accounts. It only requires that humans respond to visible social proof.

## Limitation
Negative manipulation can produce correction effects. The Muchnik et al. experiment found asymmetric effects: positive herding persisted more strongly than negative herding.
