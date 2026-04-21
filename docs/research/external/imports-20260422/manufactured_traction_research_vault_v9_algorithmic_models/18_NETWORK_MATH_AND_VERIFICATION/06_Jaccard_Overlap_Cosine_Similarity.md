# Jaccard, Cosine, and Content Similarity

Similarity helps detect accounts or content that move together.

## Jaccard overlap

For two accounts:

`J(A,B) = |A ∩ B| / |A ∪ B|`

Use when actions are binary: posted/not posted, reviewed/not reviewed.

## Cosine similarity

For action vectors `x` and `y`:

`cos(x,y) = (x · y) / (||x|| ||y||)`

Use when actions are weighted: view counts, post counts, review ratings, number of comments.

## Caption similarity

Use a conservative, non-operational approach:

- exact duplicate text
- high token overlap
- repeated hashtag sequence
- same URL
- same media hash
- same template structure

## Visual/media similarity

For research, store only safe fingerprints where allowed:

- perceptual hash
- duration
- frame signature
- audio fingerprint
- source URL
- upload timestamp

## Warning

High similarity alone is not enough. Newsrooms, fan accounts, and official campaign partners can share similar content legitimately. The claim strengthens when similarity combines with timing, repetition, and undisclosed origin.
