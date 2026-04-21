# Cost and Latency Budgeting

## Purpose

Keep the agent cheap enough to run continuously.

## Cost categories

```text
model calls
research calls
creative generation
platform API
data storage
measurement
human/manual execution if any
```

## Decision

Use expensive models for:

```text
strategy
math modeling
failure autopsy
final quality grading
```

Use cheaper models for:

```text
first-pass variant generation
summaries
formatting
repetitive table updates
```
