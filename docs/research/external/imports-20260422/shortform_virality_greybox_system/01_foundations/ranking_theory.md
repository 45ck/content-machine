# Ranking Theory

## Expected utility ranking

Let each candidate video `v_i` have expected value:

```text
q_i = E[viewer utility | user, video, session, time]
```

Let feed slots have exposure weights:

```text
π_1 ≥ π_2 ≥ π_3 ≥ ... ≥ π_n
```

A ranking `σ` has expected total value:

```text
U(σ) = Σ_r π_r · q_{σ(r)}
```

If a worse video `i` is above a better video `j`:

```text
q_i < q_j
```

and slot `a` is above slot `b`:

```text
π_a ≥ π_b
```

Then:

```text
U_old = π_a q_i + π_b q_j
U_new = π_a q_j + π_b q_i

U_new - U_old
= (π_a - π_b)(q_j - q_i)
```

Since both terms are non-negative:

```text
U_new - U_old ≥ 0
```

So any inversion can be improved by swapping. Therefore:

```text
rank videos by descending expected utility
```

## Implication for our system

We should not predict “views” directly as the only objective.

We should predict viewer utility:

```text
Utility =
positive expected outcomes
- negative expected outcomes
```

Then rank drafts and live videos by calibrated expected utility.
