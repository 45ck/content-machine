# AIA-003 / SHP — Saliency Heatmap Placement

## Reference label

AIA-003 / SHP — Saliency Heatmap Placement

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | Adaptive System |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Predict likely gaze heatmaps and avoid high-conflict zones.

## Mechanism

Automates gaze-safe placement.

## Expected direction

Better visual recall and fewer occlusions.

## Failure mode

Saliency may not equal semantic importance.

## Minimum viable experiment

Fixed vs saliency-aware placement.

## Primary metrics

Visual recall; occlusion rate

## Source IDs

S12; S14

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
