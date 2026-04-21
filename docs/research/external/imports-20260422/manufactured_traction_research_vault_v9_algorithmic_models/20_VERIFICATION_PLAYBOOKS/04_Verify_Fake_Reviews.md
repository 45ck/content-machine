# Verify Fake Reviews

## Claim being tested

High rating volume reflects real customer experience.

## Alternative hypothesis

Reviews are fabricated, incentivized, selectively edited, or coordinated.

## Data fields

- reviewer_id
- product_id
- review_timestamp
- rating
- review_text
- verified_purchase flag
- reviewer history
- product launch date
- incentive disclosure
- geographic/device metadata where lawful/available

## Graph model

- Reviewer-product bipartite graph.
- Reviewer-reviewer projection based on common products, timing, rating patterns, text similarity.

## Metrics

- review burst z-score
- rating entropy
- text similarity
- reviewer-product overlap
- account age
- verified-purchase mismatch
- reviewer concentration across related products
- sentiment extremity

## Strong red flags

- many five-star reviews in a short time
- repeated review templates
- reviewers only review products from one seller network
- reviews arrive before plausible use
- negative reviews disappear or are edited
- incentive disclosed nowhere

## Safe conclusion

"Review patterns show anomalous timing/text/rating concentration and should be treated as lower-trust until verified by independent purchase evidence."
