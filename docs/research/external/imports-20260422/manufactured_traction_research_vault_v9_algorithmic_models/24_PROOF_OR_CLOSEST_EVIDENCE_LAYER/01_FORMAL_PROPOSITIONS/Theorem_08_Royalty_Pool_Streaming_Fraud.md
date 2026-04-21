# Theorem 08 — Streaming Fraud in a Royalty Pool

## Claim
If royalty payouts are proportional to stream share, fake streams convert synthetic attention into real money and reduce other artists' share.

## Setup
Let total royalty pool be `R`. Artist `i` receives:

\[
P_i = R \frac{s_i}{\sum_j s_j}
\]

If fake streams `f_i` are added:

\[
P'_i = R \frac{s_i+f_i}{\sum_j s_j+f_i}
\]

The payout increase is:

\[
P'_i-P_i=R\left(\frac{s_i+f_i}{S+f_i}-\frac{s_i}{S}\right)
= R\frac{f_i(S-s_i)}{S(S+f_i)}
\]

This is positive whenever `f_i>0` and `s_i<S`.

## Evidence
The DOJ Michael Smith case alleged AI-generated songs and bot streams were used to mimic genuine listening and steal royalty payments. Deezer reported large-scale AI track uploads and high fraudulent stream detection on fully AI-generated tracks.

## Limitation
Actual payout systems vary and may include fraud filters, minimum thresholds, user-centric accounting, or demonetization.
