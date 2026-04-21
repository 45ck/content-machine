# Theorem 01 — Monotone Ranking Response

## Claim
If a platform ranks items by a scoring function that is increasing in an engagement proxy, then artificial engagement can increase rank whenever the artificial boost is large enough to cross a neighbouring score threshold.

## Setup
Let item `i` have score:

\[
S_i = \alpha Q_i + \beta E_i + \gamma R_i
\]

where:

- `Q_i` = latent or estimated quality,
- `E_i` = observed engagement proxy,
- `R_i` = recency or other ranking feature,
- `\beta > 0`.

Let item `j` currently outrank item `i`:

\[
S_j > S_i
\]

A manufactured engagement boost adds `\Delta E_i` to item `i`, producing:

\[
S'_i = S_i + \beta \Delta E_i
\]

## Result
Item `i` overtakes item `j` whenever:

\[
\Delta E_i > \frac{S_j - S_i}{\beta}
\]

## Interpretation
This is the simplest mathematical proof that signal manipulation can work under a monotone ranking system. The tactic does not need to improve the product or content. It only needs to increase the measured signal enough to cross a ranking boundary.

## Evidence link
This formal mechanism is consistent with platform policies that explicitly prohibit artificially increasing views, likes, comments, installs, reviews, or other ranking-related signals.

## Limitation
Real ranking functions are nonlinear, personalized, delayed, and adversarially filtered. The theorem proves the monotone mechanism, not guaranteed success on a specific platform.
