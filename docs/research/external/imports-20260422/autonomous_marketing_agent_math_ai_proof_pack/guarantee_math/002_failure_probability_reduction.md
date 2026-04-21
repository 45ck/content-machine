# Failure Probability Reduction

## Failure probability

```text
P(total_failure) =
P(no_demand)
+ P(wrong_buyer)
+ P(weak_offer)
+ P(weak_proof)
+ P(bad_friction)
+ P(bad_economics)
+ P(bad_measurement)
− overlaps
```

## Reduction strategy

| Failure | Reduction |
|---|---|
| no demand | demand mining before spend |
| wrong buyer | buyer-state diagnosis |
| weak offer | offer engine |
| weak proof | proof path assets |
| friction | landing and signup tests |
| bad economics | LTV/CAC gates |
| bad measurement | event and lift design |
