# Null Model Worked Example

## Observed

A launch has 100 accounts. In observed data:

- 45 account pairs co-post same object within 60 seconds at least 4 times.

## Null simulation

Shuffle timestamps 1,000 times while preserving:

- same accounts
- same objects
- same number of posts

The null distribution shows:

- average pairs above threshold: 4
- 95th percentile: 12
- max in simulations: 18

## Empirical p-value

`p = (1 + simulations where null >= observed) / (1 + simulations)`

If none of 1,000 simulations reaches 45:

`p = (1 + 0) / (1 + 1000) = 0.001`

## Safe conclusion

"The observed repeated co-action count is unusually high under a timestamp-shuffle baseline."

## Not a safe conclusion

"This proves the accounts are fake."

Math shows unusualness, not intent.
