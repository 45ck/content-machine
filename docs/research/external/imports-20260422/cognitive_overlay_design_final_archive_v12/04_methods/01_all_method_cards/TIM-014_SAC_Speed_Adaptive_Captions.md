# TIM-014 / SAC — Speed-Adaptive Captions

## Reference label

TIM-014 / SAC — Speed-Adaptive Captions

## Classification

| Field | Value |
|---|---|
| Category | Timing / Rhythm |
| Family | Timing and Rhythm |
| Class | Timing Method |
| Phase | Explore later |
| Priority | P3 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Detect playback speed or speech rate and adjust overlay density.

## Mechanism

Personalizes load.

## Expected direction

Better across fast/slow viewers.

## Failure mode

Platform may not expose playback speed.

## Minimum viable experiment

Manual fast/slow variants.

## Primary metrics

Comprehension by speech rate

## Source IDs

S06; S30

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
