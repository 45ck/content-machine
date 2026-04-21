# GAZ-005 / USZT — UI-Safe Zone Templates

## Reference label

GAZ-005 / USZT — UI-Safe Zone Templates

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Define TikTok/Reels/Shorts danger zones and avoid them.

## Mechanism

Prevents platform interface collision.

## Expected direction

Higher readability in feed context.

## Failure mode

Safe zones vary by device/platform.

## Minimum viable experiment

Bottom-fixed vs UI-safe placement.

## Primary metrics

Readability; occlusion rate

## Source IDs

S02; S15; S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
