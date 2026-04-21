# GAZ-003 / ASC — Action-Safe Captioning

## Reference label

GAZ-003 / ASC — Action-Safe Captioning

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong adjacent |
| Status | Backlog |

## Definition

Avoid hands, products, joints, cursor, and key action path.

## Mechanism

Prevents text from stealing task-critical visual information.

## Expected direction

Better visual recall and task learning.

## Failure mode

May require dynamic object tracking.

## Minimum viable experiment

Action-covered vs action-safe.

## Primary metrics

Visual recall; task accuracy

## Source IDs

S10; S14; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
