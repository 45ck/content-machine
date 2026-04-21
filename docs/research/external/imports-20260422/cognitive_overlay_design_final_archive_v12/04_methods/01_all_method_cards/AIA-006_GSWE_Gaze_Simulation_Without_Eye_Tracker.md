# AIA-006 / GSWE — Gaze Simulation Without Eye Tracker

## Reference label

AIA-006 / GSWE — Gaze Simulation Without Eye Tracker

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | Adaptive System |
| Phase | Explore later |
| Priority | P2 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Use saliency/meaning maps to simulate likely gaze conflict.

## Mechanism

Low-cost proxy for early testing.

## Expected direction

Catches major layout failures.

## Failure mode

Cannot replace real gaze data.

## Minimum viable experiment

Model score vs user gaze subset.

## Primary metrics

Correlation with gaze/errors

## Source IDs

S11; S12

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
