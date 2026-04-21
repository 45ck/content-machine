# VLD-009 / NCCC — Native Caption Conflict Checker

## Reference label

VLD-009 / NCCC — Native Caption Conflict Checker

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Avoid overlay collisions with platform auto-captions or imported captions.

## Mechanism

Separates full caption layer and semantic layer.

## Expected direction

Improves access and readability.

## Failure mode

Platforms may render differently.

## Minimum viable experiment

With/without conflict checking.

## Primary metrics

Occlusion; user complaints

## Source IDs

S01; S02; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
