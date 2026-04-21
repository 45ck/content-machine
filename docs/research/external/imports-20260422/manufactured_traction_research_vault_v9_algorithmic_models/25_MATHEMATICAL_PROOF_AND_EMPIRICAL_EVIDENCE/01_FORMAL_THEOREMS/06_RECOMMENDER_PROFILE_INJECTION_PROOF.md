# Recommender Profile-Injection Proof

## Claim

If a recommender estimates item value from user-item interactions, fake profiles can shift item estimates.

## Simple average model

For target item `i`, with `n` real ratings mean `μ`, add `f` fake high ratings `r_f`:

```text
μ' = (nμ + f r_f) / (n + f)
μ' - μ = f(r_f - μ) / (n + f)
```

If `r_f > μ`, the target estimate rises.

## Collaborative filtering

In collaborative filtering, fake profiles can also change similarity structure by embedding the target item into plausible taste profiles.

## Literature support

Recommender security literature calls this shilling or profile-injection. Push attacks promote a target; nuke attacks demote a target.
