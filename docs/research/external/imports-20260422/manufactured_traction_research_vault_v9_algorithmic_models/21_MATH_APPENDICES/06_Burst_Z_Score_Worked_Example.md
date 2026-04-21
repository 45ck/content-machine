# Burst Z-Score Worked Example

A product gets reviews by day:

`[2, 3, 1, 2, 4, 3, 55, 2, 1, 3]`

The day with 55 reviews is anomalous.

Compute:

`z = (x - mean) / standard_deviation`

If the z-score is very high, investigate:

- launch event
- press coverage
- discount campaign
- incentivized review drive
- review purchase
- platform migration
- bot/fake-review event

## Safe conclusion

"Review volume on this day is anomalous relative to surrounding days and requires source-context review."
