# Multi-Layer Networks

Manufactured traction often uses more than one behaviour type.

## Layers

Possible layers:

- co-posted same URL
- reused same media
- used similar captions
- posted in the same time window
- commented on same content
- used same hashtag sequence
- shared same affiliate code
- reviewed same product
- appeared in the same campaign window

## Multi-layer edge

For account pair `(i,j)`:

`W_ij = α1 * co_url + α2 * co_media + α3 * caption_similarity + α4 * time_sync + α5 * hashtag_overlap`

Weights `α` should be chosen transparently.

## Why multi-layer analysis matters

A campaign may avoid exact duplicates but still reveal itself through combined weak signals.

Example:

- captions are different
- media is reused
- timestamps are synchronized
- hashtags overlap
- accounts share the same narrow campaign history

Individually each signal is weak. Together they form stronger evidence.

## Research warning

Do not hide subjective choices. Always disclose:

- which layers were used
- how weights were set
- how thresholds were chosen
- whether results are robust under alternative weights
