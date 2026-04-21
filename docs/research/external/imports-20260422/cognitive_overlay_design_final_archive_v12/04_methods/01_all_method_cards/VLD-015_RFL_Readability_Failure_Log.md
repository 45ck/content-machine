# VLD-015 / RFL — Readability Failure Log

## Reference label

VLD-015 / RFL — Readability Failure Log

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Annotate every point where a tester missed or struggled with text.

## Mechanism

Creates iterative quality loop.

## Expected direction

Fewer recurring failures.

## Failure mode

Manual work needed.

## Minimum viable experiment

No log vs failure-log revision.

## Primary metrics

Revision improvement rate

## Source IDs

S28; S30

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
