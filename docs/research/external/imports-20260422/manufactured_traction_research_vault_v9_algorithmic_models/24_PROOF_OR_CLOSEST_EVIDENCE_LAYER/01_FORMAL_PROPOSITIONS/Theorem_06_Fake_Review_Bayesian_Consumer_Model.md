# Theorem 06 — Fake Reviews in a Bayesian Consumer Model

## Claim
If consumers update beliefs about product quality from reviews, then fake positive reviews increase purchase probability whenever the posterior crosses a choice threshold.

## Setup
Let product quality `q` be uncertain. A consumer has prior mean `\mu_0`. Reviews provide noisy signals `s_k`.

A simple posterior mean is:

\[
\mu_n = \frac{\lambda_0 \mu_0 + \sum_{k=1}^{n} s_k}{\lambda_0+n}
\]

If fake reviews add `m` positive signals with value `s_f`, the posterior becomes:

\[
\mu'_{n+m}=\frac{\lambda_0 \mu_0+\sum_{k=1}^{n}s_k+m s_f}{\lambda_0+n+m}
\]

The fake-review shift is positive whenever `s_f > \mu_n`.

## Purchase threshold
If purchase occurs when `\mu \ge \theta`, fake reviews change the decision whenever:

\[
\mu_n < \theta \le \mu'_{n+m}
\]

## Evidence
NBER experimental evidence found fake reviews made consumers more likely to choose lower-quality products and produced welfare losses around 12 cents per dollar in the studied setting. A separate NBER Amazon model found fake reviews reduce consumer welfare and shift sales from honest to dishonest sellers.

## Limitation
Consumers differ in trust, experience, category knowledge, and suspicion. The model proves the directional mechanism under review-based updating, not universal susceptibility.
