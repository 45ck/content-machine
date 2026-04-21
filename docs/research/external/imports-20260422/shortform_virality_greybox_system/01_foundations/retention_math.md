# Retention Math

## Watch duration

Let:

```text
T = watch duration
L = video length
S(t) = P(T ≥ t)
```

The expected watch time is the area under the survival curve:

```text
E[min(T, L)] = ∫_0^L S(t) dt
```

Completion rate:

```text
CompletionRate = S(L)
```

Average percentage viewed:

```text
APV = E[min(T, L)] / L
```

Loop or rewatch value:

```text
LoopValue = E[max(T - L, 0)] / L
```

## Retention score

```text
RetentionScore =
a · ExpectedWatchSeconds
+ b · AveragePercentageViewed
+ c · CompletionRate
+ d · RewatchRate
+ e · EndRetention
```

## Why survival modeling is preferred

A single average watch-time target loses where viewers leave.

A survival curve gives:

```text
expected watch time
completion
drop-off timestamps
segment diagnosis
edit recommendations
```

## Segment-level diagnosis

For each segment `s_j`:

```text
DropRisk_j = S(t_start_j) - S(t_end_j)
```

Segments with high `DropRisk_j` should be examined for:

```text
dead air
promise/payoff mismatch
complexity spike
topic switch
visual/audio quality problem
loss of novelty
```
