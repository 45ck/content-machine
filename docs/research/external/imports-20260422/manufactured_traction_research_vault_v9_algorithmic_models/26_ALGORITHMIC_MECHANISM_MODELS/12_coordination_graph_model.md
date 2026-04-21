# Coordination Graph Model

## Purpose
This model turns repeated co-action into a graph.

Actors are nodes. An edge connects actors \(a\) and \(b\) if they perform the same action on the same object within time window \(\Delta t\).

Edge weight:

\[
w_{ab}=\sum_o \mathbf{1}(|t_{a,o}-t_{b,o}| \le \Delta t)
\]

Retain edges if:

\[
w_{ab} \ge r
\]

where \(r\) is a repetition threshold.

## Why repetition matters
One coincidence is weak evidence. Repeated same-action timing across many objects is much harder to explain by chance.

## Research use
This model supports detection of clipping rings, astroturfing, review bursts, hashtag campaigns, coordinated comments, and cross-platform seeding.
