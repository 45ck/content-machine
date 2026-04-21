# Verify Clipping Campaigns with Network Maths

## Claim being tested

A creator, brand, product, song, or streamer appears to be everywhere because many accounts independently discovered it.

## Alternative hypothesis

A paid or coordinated clipping layer created repeated exposure.

## Data fields

- account_id
- source_video_id or media_hash
- clip_id
- timestamp
- caption
- hashtags
- watermarks
- linked destination
- disclosure text
- view_count / like_count / comment_count

## Graph model

- Node: posting account.
- Edge: two accounts post the same source clip or same media hash within a time window.
- Weight: number of repeated co-posted clips.

## Metrics

- repeated co-action edge weight
- cluster density
- content reuse frequency
- caption similarity
- hashtag sequence overlap
- burst ratio
- view-to-conversion mismatch
- proportion of accounts dedicated mostly to one subject

## Verification logic

Strong evidence requires convergence:

1. many accounts post the same source assets
2. timing is unusually synchronized
3. captions/hashtags are similar
4. accounts have thin or campaign-specific histories
5. sponsorship or incentive is not disclosed
6. observed graph is denser than a timestamp-shuffle null model

## Safe conclusion

"Observed posting patterns are consistent with coordinated clip amplification and are unlikely under the tested independent timing baseline."

Do not claim illegality without regulator/platform evidence.
