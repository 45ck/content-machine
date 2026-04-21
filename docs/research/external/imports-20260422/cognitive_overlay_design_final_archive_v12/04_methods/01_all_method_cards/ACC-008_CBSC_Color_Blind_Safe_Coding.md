# ACC-008 / CBSC — Color-Blind Safe Coding

## Reference label

ACC-008 / CBSC — Color-Blind Safe Coding

## Classification

| Field | Value |
|---|---|
| Category | Personalization / Access |
| Family | Accessibility and Personalization |
| Class | Access / Personalization Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong requirement |
| Status | Backlog |

## Definition

Never rely on color alone; pair with labels/icons/shape.

## Mechanism

Accessibility and robustness.

## Expected direction

Fewer interpretation errors.

## Failure mode

More visual elements may clutter.

## Minimum viable experiment

Color-only vs color+label.

## Primary metrics

Role identification; access rating

## Source IDs

S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
