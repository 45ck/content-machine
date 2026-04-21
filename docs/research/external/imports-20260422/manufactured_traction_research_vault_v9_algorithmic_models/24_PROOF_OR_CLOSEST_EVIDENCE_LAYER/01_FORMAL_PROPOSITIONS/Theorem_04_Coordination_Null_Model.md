# Theorem 04 — Coordination Null Model

## Claim
Repeated same-action behaviour by the same pair or cluster of accounts within short time windows becomes exponentially less plausible under an independence null model.

## Setup
Suppose account pair `(a,b)` independently performs the same action on the same object within time window `\tau` with probability `p` in a single opportunity.

Across `n` independent opportunities, the probability of at least `r` coincidences is:

\[
P(X \ge r) = \sum_{k=r}^{n} \binom{n}{k}p^k(1-p)^{n-k}
\]

If `p` is small and `r` is moderately large, this probability collapses quickly.

## Research use
This is the statistical basis for coordination-network analysis: connect two actors if they repeatedly perform the same action within a time window more often than expected by chance.

## Practical evidence
Rogers and Righetti describe coordinated actors as those performing the same action at least `r` times within time window `t`. The Coordination Network Toolkit supports co-tweet, co-retweet, co-link, co-reply, co-similarity, and multi-behaviour networks.

## Limitation
A low p-value for coordination is not proof of deception. Legitimate fandoms, newsrooms, emergency-response teams, activist networks, and communities can coordinate openly. Intent requires corroborating evidence.
