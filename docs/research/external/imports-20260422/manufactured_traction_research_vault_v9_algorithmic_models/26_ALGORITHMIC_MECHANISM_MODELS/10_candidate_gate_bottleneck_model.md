# Candidate Gate Bottleneck Model

## Purpose
This model explains why small boosts can have large effects when they cross inclusion boundaries.

Suppose a platform selects candidates if:

\[
H_i \ge T_c
\]

where \(H_i\) is candidate score and \(T_c\) is a gate threshold.

Before manipulation:

\[
H_i < T_c
\]

After manipulation:

\[
H_i + \Delta H_i \ge T_c
\]

Exposure jumps from approximately zero to some positive test allocation:

\[
E_i: 0 \rightarrow E_{test}
\]

## Interpretation
This is a discontinuity. An item hidden below the gate may have no chance to prove itself; once it crosses the gate, feedback dynamics begin.
