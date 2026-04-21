# ROI / Time-Window Compression

## Why compression is mandatory

Raw cortical vertices are high-dimensional. With ordinary creator datasets, raw vertices will overfit.

## Compression steps

```text
1. Run TRIBE on video/audio/text.
2. Align predicted response to video time.
3. Group vertices into ROI families.
4. Compute summary statistics by time window.
5. Align response changes to events: cuts, captions, reveals, beat drops.
6. Store scalar features in feature store.
```

## ROI families

```text
visual
auditory
language
attention
social / mentalizing
self / identity
valuation / reward proxy
executive / cognitive load
```

## Summary statistics

```text
mean
max
slope
variance
volatility
peak timing
decay after hook
event-aligned delta
late-window strength
first-to-final loop similarity
```

## Event-aligned feature example

```text
CutResponseDelta_i =
Response(t_i + 1s) - Response(t_i - 1s)
```

## Hook response example

```text
TRIBE_HookScore =
0.40·HookPeak
+ 0.25·HookSlope
+ 0.20·CrossModalAlignment
- 0.15·HookVolatilityPenalty
```
