# Theorem 09 — Thresholded Launch Rank

## Claim
On launch platforms, a small artificial boost near a rank threshold can have discontinuous reputational value.

## Setup
Let launch score be:

\[
S = U + cC + dD
\]

where `U` is upvotes, `C` is comments, and `D` is diversity/quality of engagement. Suppose a badge is awarded if:

\[
S \ge \theta
\]

An artificial boost `\Delta S` changes badge status whenever:

\[
S < \theta \le S+\Delta S
\]

## Interpretation
The manipulative value is not only the rank. It is the downstream badge, headline, screenshot, investor update, or legitimacy signal.

## Detection logic
Rank manipulation is suspected when early engagement is high but comments are shallow, user histories are weak, post-launch retention is low, and off-platform outreach records show coordinated pressure or incentives.
