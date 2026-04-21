# TYP-014 / VWAR — Variable Weight Attention Ramp

## Reference label

TYP-014 / VWAR — Variable Weight Attention Ramp

## Classification

| Field | Value |
|---|---|
| Category | Typography / Anchors |
| Family | Typography and Anchors |
| Class | Anchor / Typography Component |
| Phase | Explore later |
| Priority | P3 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

Gradually increase weight on words as they become relevant.

## Mechanism

Smooth cueing instead of sudden pop.

## Expected direction

Better perceived smoothness.

## Failure mode

Animation could distract.

## Minimum viable experiment

Static bold vs weight ramp.

## Primary metrics

Smoothness; recall; gaze

## Source IDs

S19; S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
