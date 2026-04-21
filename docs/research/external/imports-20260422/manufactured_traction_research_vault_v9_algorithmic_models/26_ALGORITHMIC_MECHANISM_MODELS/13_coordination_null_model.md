# Coordination Null Model

## Purpose
A coordination graph needs a null model to avoid overclaiming.

## Timestamp shuffle
Keep each actor's number of actions and each object's popularity fixed, but shuffle timestamps. Recompute coordination edges. Repeat \(B\) times.

Observed statistic:

\[
T_{obs}=\#\{(a,b): w_{ab}\ge r\}
\]

Null distribution:

\[
T^{(1)}, T^{(2)}, \dots, T^{(B)}
\]

Empirical p-value:

\[
p = \frac{1 + \#\{b: T^{(b)} \ge T_{obs}\}}{B+1}
\]

## Interpretation
If observed repeated coordination is far above the null, the pattern is unlikely under the chosen independence assumptions.

## Caution
The null model can be wrong. Real communities may coordinate openly or respond to the same news event. Use qualitative context.
