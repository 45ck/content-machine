# Pairwise Rank-Flip Model

## Purpose
This model shows the exact condition under which one item overtakes another in a ranked feed.

Let two items have scores:

\[
S_A = \theta^T x_A
\]

\[
S_B = \theta^T x_B
\]

A appears above B if:

\[
S_A > S_B
\]

If B receives artificial signal \(\delta\), its new score is:

\[
\tilde{S}_B = \theta^T(x_B + \delta)
\]

B overtakes A if:

\[
\theta^T \delta > \theta^T(x_A - x_B)
\]

## Interpretation
The right side is the **rank gap**. The left side is the weighted artificial boost.

A small boost can matter if the item is close to the boundary. A large boost may fail if the item is far below the cutoff or if the platform discounts suspicious signals.

## Why this matters
Manufactured traction does not need to dominate the entire platform. It only needs to flip enough local comparisons: search result position, candidate inclusion, recommendation batch selection, top comment, launch rank, or trending threshold.
