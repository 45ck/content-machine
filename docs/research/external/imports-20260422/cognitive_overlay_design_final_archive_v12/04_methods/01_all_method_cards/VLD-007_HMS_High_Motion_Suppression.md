# VLD-007 / HMS — High-Motion Suppression

## Reference label

VLD-007 / HMS — High-Motion Suppression

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Reduce caption animation and density during high visual motion.

## Mechanism

Prevents competing motion streams.

## Expected direction

Better visual recall.

## Failure mode

Could miss key speech during action.

## Minimum viable experiment

Motion-adaptive vs fixed overlay.

## Primary metrics

Visual recall; comprehension

## Source IDs

S19; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
