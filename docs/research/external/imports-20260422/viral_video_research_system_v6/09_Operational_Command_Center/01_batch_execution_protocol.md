# Batch Execution Protocol

## Batch types

### B1 — First-frame batch

```text
Same body.
Five first frames.
Metric: CTV / early hold.
```

### B2 — Hook batch

```text
Same body and first frame.
Five hooks.
Metric: 3-sec hold / APV.
```

### B3 — Text batch

```text
Same body.
Different captions/labels/overlays.
Metric: APV / completion / saves.
```

### B4 — Proof batch

```text
Same claim.
Advice only vs before/after vs screen recording vs analytics proof.
Metric: saves / follows / trust.
```

### B5 — CTA batch

```text
Same body.
Different action prompt.
Metric: save/send/comment/follow rate.
```

### B6 — Search-feed hybrid batch

```text
Same topic.
Feed-native version + search-native version + hybrid version.
Metric: 24h reach and 7d/30d search.
```

## Batch minimum

```text
3 variants = minimum
5 variants = preferred
10 variants = strong screening batch
```

## Batch closeout

Every batch ends with:

```text
winner
loser
uncertain result
next replicate
next rewrite
mechanism decision
```
