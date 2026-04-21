# GAZ-006 / SAP — Saliency-Avoiding Placement

## Reference label

GAZ-006 / SAP — Saliency-Avoiding Placement

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Place text away from predicted high-saliency regions unless it is a label.

## Mechanism

Reduces competition with visual content.

## Expected direction

Better visual recall.

## Failure mode

Low-saliency areas may be poor contrast.

## Minimum viable experiment

Fixed vs saliency-aware placement.

## Primary metrics

Visual recall; gaze distribution

## Source IDs

S12; S14

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
