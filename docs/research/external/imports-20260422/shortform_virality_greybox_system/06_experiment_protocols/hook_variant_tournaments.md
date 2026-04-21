# Hook Variant Tournaments

## Purpose

It is easier to predict which variant will perform better than to predict absolute virality.

## Protocol

For each concept:

```text
create 3–5 hook variants
keep topic, creator, format, length, and posting window similar
score each variant pre-publish
publish variants under controlled conditions
measure viewed-vs-swiped, 3s hold, APV, shares/reach
```

## Labels

```text
variant A beats variant B on viewed-vs-swiped
variant A beats variant B on APV
variant A beats variant B on shares/reach
```

## Models

```text
pairwise logistic regression
LambdaMART
RankNet
LightGBM ranker
```

## Success criterion

```text
model-selected hook beats random selection by 15%+
```

## Use case

This is the highest-value creator workflow:

```text
generate variants
score variants
publish/test best
feed results back into model
```
