# Formulas for Repeated Coordination

## Event representation

Each action is:

`e = (a, o, t, x)`

Where:

- `a` = actor/account
- `o` = object/content
- `t` = timestamp
- `x` = action type

## Pairwise co-action indicator

`I_ijot = 1` when actors `i` and `j` act on object `o` within time window `t`.

More explicitly:

`I_ijo = 1[ |time(i,o) - time(j,o)| ≤ Δ ]`

## Edge weight

`w_ij = Σ_o I_ijo`

Create an edge if:

`w_ij ≥ r`

## Interpretation

- Low `w_ij`: weak/no repeated coordination.
- High `w_ij`: repeated co-action.
- High `w_ij` plus similar content/timing/disclosure problems: stronger concern.

## Threshold discipline

Report results at multiple thresholds:

- `r >= 2`
- `r >= 4`
- `r >= 8`
- `top 1% of edge weights`

A real finding should not disappear entirely under small threshold changes.
