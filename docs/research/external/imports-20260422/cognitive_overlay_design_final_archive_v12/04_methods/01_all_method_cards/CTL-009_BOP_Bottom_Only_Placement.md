# CTL-009 / BOP — Bottom-Only Placement

## Reference label

CTL-009 / BOP — Bottom-Only Placement

## Classification

| Field | Value |
|---|---|
| Category | Negative Control |
| Family | Controls and Failure Modes |
| Class | Control / Baseline |
| Phase | Experiment control |
| Priority | P0 |
| Evidence grade | Control |
| Status | Backlog |

## Definition

Always lower-third regardless of content.

## Mechanism

Placement baseline.

## Expected direction

Can block UI/captions/action.

## Failure mode

Likely loses to gaze-safe placement.

## Minimum viable experiment

Compare to gaze-safe.

## Primary metrics

Occlusion; readability

## Source IDs

S02; S14

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
