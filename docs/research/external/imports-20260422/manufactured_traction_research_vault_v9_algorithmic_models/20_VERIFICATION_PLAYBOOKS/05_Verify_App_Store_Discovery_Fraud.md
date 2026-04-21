# Verify App-Store Discovery Fraud

## Claim being tested

An app ranking or rating reflects real demand and quality.

## Alternative hypothesis

The app's apparent quality signal is distorted by fake reviews, incentivized ratings, install manipulation, or chart gaming.

## Data fields

- app_id
- review_id
- reviewer_id
- rating
- review timestamp
- app version
- install/ranking timeline
- country
- developer_id
- related apps
- complaint signals
- subscription/refund signals where available

## Metrics

- review burst z-score
- rating distribution shift by version
- rank velocity
- review text similarity
- country concentration
- related-app reviewer overlap
- retention quality proxy
- uninstall/refund ratio if available

## Graph model

Reviewer-app bipartite graph. Project reviewers by common developer, timing, and text similarity.

## Safe conclusion

"Ratings and rank movement show discovery-fraud risk indicators; app quality should not be inferred from rank alone."
