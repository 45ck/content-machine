# CTL-008 / COM — Color-Only Meaning

## Reference label

CTL-008 / COM — Color-Only Meaning

## Classification

| Field | Value |
|---|---|
| Category | Negative Control |
| Family | Controls and Failure Modes |
| Class | Control / Baseline |
| Phase | Experiment control |
| Priority | P1 |
| Evidence grade | Negative control |
| Status | Backlog |

## Definition

Use color without labels/icons for semantic roles.

## Mechanism

Accessibility negative control.

## Expected direction

Likely failure for color-blind/low contrast contexts.

## Failure mode

Meaning can be missed.

## Minimum viable experiment

Compare to color+label.

## Primary metrics

Role ID; access rating

## Source IDs

S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
