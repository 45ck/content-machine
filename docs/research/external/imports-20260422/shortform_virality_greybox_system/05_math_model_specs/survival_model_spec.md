# Survival Model Specification

## Target

For each video impression:

```text
T = watch duration
L = video length
```

Model:

```text
S(t | x) = P(T ≥ t | x)
```

## Discrete-time version

Bucket video into intervals:

```text
0–1s
1–2s
2–3s
...
```

For each interval predict:

```text
P(continue to next interval | survived so far, x)
```

Then:

```text
S(t_j) = Π_i≤j P(continue_i)
```

## Outputs

```text
expected_watch_seconds
average_percentage_viewed
completion_probability
rewatch_probability
drop_risk_by_segment
```

## Loss

Use binary cross-entropy per interval with censoring:

```text
L = -Σ_j [y_j log(p_j) + (1-y_j) log(1-p_j)]
```

## Features

```text
frame/audio/text sequence
cut locations
speech pace
subtitle density
scene changes
payoff timestamp
hook promise
TRIBE response curve
```

## Diagnostic conversion

```text
segment_drop_risk = S(segment_start) - S(segment_end)
```

High segment-drop risk becomes an editing recommendation.
