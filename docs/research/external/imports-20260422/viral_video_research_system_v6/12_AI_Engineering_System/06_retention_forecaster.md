# Retention forecaster

## Purpose

Predict likely retention risk before publishing.

## Features

```text
first-frame type
hook type
hook length
time-to-first-payoff
caption density
text centrality
face ratio
visual reset rate
story format
proof timing
CTA timing
length
platform
content form
```

## Outputs

```text
predicted CTV interval
predicted APV interval
predicted completion interval
save/send/follow potential score
risk flags
```

## Risk flags

```text
slow setup
vague hook
late payoff
heavy central text
no proof
CTA mismatch
too many simultaneous channels
```

## Use

```text
If lower-bound prediction beats baseline → post/priority.
If prediction interval is wide → exploratory test.
If upper bound below baseline → rewrite before posting.
```
