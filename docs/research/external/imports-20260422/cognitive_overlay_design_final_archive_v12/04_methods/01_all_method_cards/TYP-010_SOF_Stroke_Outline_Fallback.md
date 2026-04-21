# TYP-010 / SOF — Stroke/Outline Fallback

## Reference label

TYP-010 / SOF — Stroke/Outline Fallback

## Classification

| Field | Value |
|---|---|
| Category | Typography / Anchors |
| Family | Typography and Anchors |
| Class | Anchor / Typography Component |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Use outline/shadow only when background contrast is unstable.

## Mechanism

Maintains readability across frames.

## Expected direction

Lower missed captions.

## Failure mode

Can look noisy if too thick.

## Minimum viable experiment

Outline vs capsule vs none.

## Primary metrics

Readability; aesthetic rating

## Source IDs

S28; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
