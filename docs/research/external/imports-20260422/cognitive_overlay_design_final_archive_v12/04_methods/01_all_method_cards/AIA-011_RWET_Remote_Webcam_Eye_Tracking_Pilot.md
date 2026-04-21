# AIA-011 / RWET — Remote Webcam Eye-Tracking Pilot

## Reference label

AIA-011 / RWET — Remote Webcam Eye-Tracking Pilot

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | Adaptive System |
| Phase | Explore later |
| Priority | P3 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Use webcam gaze estimation for rough large-sample placement tests.

## Mechanism

Scales beyond lab eye-tracking.

## Expected direction

Cheap gaze proxy.

## Failure mode

Lower accuracy than lab hardware.

## Minimum viable experiment

Webcam vs self-report vs subset eye tracker.

## Primary metrics

Gaze estimates; recall

## Source IDs

S30

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
