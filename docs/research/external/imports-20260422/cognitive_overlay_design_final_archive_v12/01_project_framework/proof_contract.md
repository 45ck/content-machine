# Proof Contract

## Proof levels

| Level | Meaning |
|---:|---|
| P0 | Mechanism is plausible from adjacent research. |
| P1 | Component beats baseline in a controlled study. |
| P2 | Eye/gaze/load data supports the proposed mechanism. |
| P3 | Field A/B test shows practical uplift. |
| P4 | Method works by segment rather than only globally. |
| P5 | Adaptive system routes methods by context and avoids losers. |

## Proof requirements

Every method must declare:

1. Comparator.
2. Primary metric.
3. Secondary guardrails.
4. Failure interpretation.
5. Minimum viable experiment.
6. Deployment threshold.
7. Non-regression constraints.

## Practical significance

A statistically reliable result is not enough. A method must produce a meaningful improvement in at least one target metric without regressing critical guardrails.

Minimum practical thresholds for pilots:

| Metric | Suggested practical threshold |
|---|---:|
| Gist recall composite | +5 percentage points |
| Action recall | +5 percentage points |
| Perceived effort | −0.3 on 7-point scale |
| Completion rate | +3 percentage points |
| Text dwell time | no increase unless recall improves |
| Visual recall | no meaningful decline |
| Accessibility | no regression permitted |
