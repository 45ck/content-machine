# Threshold Cascade Model

## Purpose
This model explains why manufactured traction can be nonlinear.

Each user has a threshold \(\tau_u\). They adopt, click, share, or trust when perceived popularity exceeds that threshold:

\[
A_u(t)=1 \quad \text{if} \quad \frac{\#\text{neighbors adopted}}{\#\text{neighbors}} + s_t \ge \tau_u
\]

where \(s_t\) is a manufactured social signal.

## Cascade condition
A small seed can trigger a large cascade if enough users have thresholds just above the natural signal level.

## Interpretation
A campaign does not need to convince everyone. It needs to activate enough marginal users to trigger the next layer.

## Paper-ready line
Manufactured traction works best near thresholds: trending thresholds, candidate thresholds, badge thresholds, social-proof thresholds, investor legitimacy thresholds, and recommender expansion thresholds.
