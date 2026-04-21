# SEM-015 / KMC — Keyword-to-Microphrase Conversion

## Reference label

SEM-015 / KMC — Keyword-to-Microphrase Conversion

## Classification

| Field | Value |
|---|---|
| Category | Semantic / Compression |
| Family | Semantic Compression |
| Class | Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Convert isolated keywords into 2–4 word phrase chunks.

## Mechanism

Keeps syntax while staying sparse.

## Expected direction

Better than keyword-only overlays.

## Failure mode

Slightly more text may hurt visual recall.

## Minimum viable experiment

Keywords vs microphrases.

## Primary metrics

Gist recall; visual recall

## Source IDs

S06; S07; S09; S10; S27

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
