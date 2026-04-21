# Verify Streaming Fraud

## Claim being tested

Streams represent genuine listening demand.

## Alternative hypothesis

Streams are artificially generated or coordinated to extract royalties or influence ranking.

## Data fields

- track_id
- artist/account
- stream timestamp
- listener/account/device cluster where lawful
- geography
- playlist/source
- stream duration
- skip/completion
- saves/follows/searches
- catalog size
- upload timestamps

## Metrics

- stream burst pattern
- listener diversity
- save-to-stream ratio
- follow-to-stream ratio
- geography entropy
- track duration similarity
- playlist concentration
- catalog upload velocity
- repeated session patterns

## Graph model

Listener-track bipartite graph. Project listener clusters by repeated track sets and timing.

## Safe conclusion

"Streaming activity shows synthetic-demand risk when high stream volume is not matched by normal fan behaviours such as saves, follows, searches, or diverse listening."
