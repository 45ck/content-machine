# AIA-001 / SBE — Semantic Beat Extractor

## Reference label

AIA-001 / SBE — Semantic Beat Extractor

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | System Module |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Speculative / direct test needed |
| Status | Backlog |

## Definition

LLM extracts proposition, role, and beat boundaries from transcript.

## Mechanism

Automates compression pipeline.

## Expected direction

Faster production and consistent structure.

## Failure mode

LLM may hallucinate or distort meaning.

## Minimum viable experiment

Human vs AI beat extraction.

## Primary metrics

Edit distance; accuracy; time saved

## Source IDs

S09; S30

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
