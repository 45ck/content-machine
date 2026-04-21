# Failure bounds

## What can be bounded

You cannot bound platform randomness completely. You can bound operational failure.

## Boundable failure types

```text
unscored asset shipped
missing hypothesis
missing metric
missing decision rule
insufficient exposure unlabelled
winner scaled without replication
raw views used as sole criterion
trust guardrail ignored
```

Target:

```text
zero tolerance for operational failure
probabilistic tolerance for performance uncertainty
```

## SLOs

```text
100% of videos have brief + hypothesis + metric + CTA.
100% of tests have a primary gate.
95% of batches reviewed within 72h.
0 winners scaled before replication unless marked emergency exception.
0 clickbait/trust failures scaled.
80% of batches include at least one search-native asset.
```

## Failure review

When a batch fails, classify:

```text
model failure
creative failure
measurement failure
exposure failure
platform-fit failure
audience-fit failure
execution failure
```

A failed post is acceptable. An unclassified failure is not.
