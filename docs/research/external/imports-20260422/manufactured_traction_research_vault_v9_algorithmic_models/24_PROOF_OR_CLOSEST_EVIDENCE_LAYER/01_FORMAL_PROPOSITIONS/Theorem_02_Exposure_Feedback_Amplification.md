# Theorem 02 — Exposure Feedback Amplification

## Claim
When exposure creates engagement and engagement creates future exposure, an artificial initial boost can have multiplied downstream impact.

## Setup
Let exposure at time `t` be `X_t` and engagement be `E_t`.

\[
E_t = c X_t
\]

\[
X_{t+1} = a + bE_t
\]

where `c > 0` and `b > 0`. Substitute:

\[
X_{t+1} = a + bcX_t
\]

Let `m = bc` be the feedback multiplier.

If a campaign creates an initial artificial exposure increment `\Delta X_0`, then after `T` steps the exposure difference is:

\[
\Delta X_T = m^T \Delta X_0
\]

and cumulative added exposure is:

\[
\sum_{t=0}^{T} \Delta X_t = \Delta X_0 \frac{1 - m^{T+1}}{1-m}, \quad m \ne 1
\]

## Interpretation
If `0 < m < 1`, the artificial boost decays but still creates extra cumulative exposure. If `m \approx 1`, cumulative impact can be large. If `m > 1`, the simple model becomes explosive until platform saturation, audience limits, or filtering mechanisms intervene.

## Empirical support
Recommender-system research shows feedback loops can homogenize behaviour and amplify popularity bias. Social influence experiments show visible popularity can create accumulating herding.

## Limitation
Real platforms include caps, filtering, freshness decay, trust models, and personalized exploration. The proof shows why the feedback mechanism is plausible, not that every boost succeeds.
