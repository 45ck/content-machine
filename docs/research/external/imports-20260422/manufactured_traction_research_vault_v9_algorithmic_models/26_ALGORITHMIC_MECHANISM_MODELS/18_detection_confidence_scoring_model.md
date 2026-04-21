# Detection Confidence Scoring Model

## Purpose
This model prevents overclaiming.

Evidence dimensions:

\[
E = [E_{timing}, E_{network}, E_{content}, E_{actor}, E_{disclosure}, E_{outcome}, E_{external}]
\]

Weighted confidence:

\[
Score = \sum_k w_k E_k
\]

Suggested interpretation:

- 0-2: weak anomaly;
- 3-5: suspicious pattern;
- 6-8: strong coordination evidence;
- 9+: strong coordination plus external corroboration.

## Caution
This is not a legal standard. It is a research triage method.
