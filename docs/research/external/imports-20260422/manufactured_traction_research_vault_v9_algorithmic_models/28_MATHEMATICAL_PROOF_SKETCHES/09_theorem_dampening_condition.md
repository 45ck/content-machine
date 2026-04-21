# Theorem: Manipulation Fails Under Strong Dampening

## Statement
Let rank score be:

\[
S=\theta^Tx-\lambda A
\]

where \(A\) is anomaly score. Manipulation adds \(\delta\) to signal and \(\Delta A\) to anomaly.

Manipulation improves score only if:

\[
\theta^T\delta > \lambda\Delta A
\]

## Relevance
This explains why platforms can make manipulation unprofitable by increasing detection sensitivity and penalties.
