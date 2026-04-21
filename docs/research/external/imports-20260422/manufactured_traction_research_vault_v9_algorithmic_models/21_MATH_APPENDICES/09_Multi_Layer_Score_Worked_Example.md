# Multi-Layer Score Worked Example

A pair of accounts has:

- same media reuse count = 5
- near-synchronous posts = 4
- caption similarity = 0.82
- hashtag overlap = 0.90
- repeated comment frames = 3

Define:

`score = 2*media_reuse + 2*time_sync + caption_similarity + hashtag_overlap + comment_frames`

`score = 2*5 + 2*4 + 0.82 + 0.90 + 3 = 22.72`

Compare against a distribution of scores for random account pairs.

## Good practice

Do not make thresholds arbitrary. Use percentiles:

- top 5% = review
- top 1% = strong review
- top 0.1% = priority investigation
