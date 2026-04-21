# End-to-end example

## Hypothesis

```text
Result-first before/after first frame improves chose-to-view for caption-placement tutorials.
```

## Experiment

```text
Method: M-MPT / matched-pair creative twin test
Platform: YouTube Shorts + Reels Trial
Primary metric: CTV
Guardrails: APV, CPL, TRU
Variants:
A = talking face open
B = before/after split open
C = visible mistake open
D = proof screenshot open
```

## Preflight

```text
All variants use same body.
All variants pass trust and classification gates.
Only first frame changes.
```

## Decision

At 72h:

```text
If B has P(CTV_B > CTV_A + δ) ≥ 0.85 and APV/CPL do not collapse:
    replicate B in two new topics.

If B wins CTV but loses APV:
    rewrite body/expectation match.

If no variant gets sufficient exposure:
    route to controlled exposure and re-read.
```

## Scaling

After replication:

```text
Use before/after first frame as default for visual tutorial formats.
Keep 30% exploration for alternate first frames.
```
