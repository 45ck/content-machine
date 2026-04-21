# Verify Reddit Astroturfing

## Claim being tested

Reddit users independently discovered and discussed a product.

## Alternative hypothesis

A planned campaign seeded community-native posts to look organic.

## Data fields

- account_id
- subreddit
- post_id
- timestamp
- title
- body
- media_hash
- external link
- comments
- account age
- prior subreddit activity
- disclosure / promotional label
- upvotes and comments over time

## Graph model

- Node: account.
- Edge: shared product/topic/media/link within a campaign window.
- Weight: repeated shared assets, titles, or discussion frames.

## Metrics

- account age distribution
- prior-subreddit activity ratio
- title-template similarity
- media reuse
- posting burst windows
- comment reinforcement pattern
- cross-subreddit repetition
- upvote/comment velocity

## False positives

- legitimate launch day
- fan community discovery
- influencer/creator disclosure
- news event
- subreddit trend

## Safe conclusion

"Posts show organic-style promotion patterns consistent with astroturfing, especially if account histories are thin and assets/framing repeat without disclosure."
