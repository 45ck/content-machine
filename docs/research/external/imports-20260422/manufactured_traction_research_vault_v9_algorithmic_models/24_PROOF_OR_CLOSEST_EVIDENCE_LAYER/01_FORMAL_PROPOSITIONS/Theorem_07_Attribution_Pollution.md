# Theorem 07 — Attribution Pollution

## Claim
If budgets are allocated based on attributed conversions, false attribution causes money to flow to channels that did not create demand.

## Setup
Let true incremental conversions from channel `c` be `T_c`. Let measured conversions be:

\[
M_c = T_c + F_c
\]

where `F_c` is false or stolen attribution. A budget rule allocates:

\[
B_c = B \frac{M_c}{\sum_j M_j}
\]

The excess budget assigned to `c` is:

\[
\Delta B_c = B \left( \frac{T_c+F_c}{\sum_j T_j + \sum_j F_j} - \frac{T_c}{\sum_j T_j} \right)
\]

If false attribution is concentrated in `c`, then `\Delta B_c > 0` for many realistic parameter values.

## Interpretation
The fraudster does not need to create real demand. It is enough to appear causally responsible for demand.

## Detection logic
Compare attributed conversions to holdout lift, post-conversion quality, click-to-conversion timing, device fingerprints, source distribution, and server-side truth.
