# GAZ-004 / ONL — Object-Near Labels

## Reference label

GAZ-004 / ONL — Object-Near Labels

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot second |
| Priority | P1 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Place short labels next to the relevant object instead of bottom captions.

## Mechanism

Reduces split attention and search.

## Expected direction

Better tutorial comprehension.

## Failure mode

Labels may crowd the object.

## Minimum viable experiment

Bottom caption vs object-near labels.

## Primary metrics

Task recall; gaze travel

## Source IDs

S13; S14

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
