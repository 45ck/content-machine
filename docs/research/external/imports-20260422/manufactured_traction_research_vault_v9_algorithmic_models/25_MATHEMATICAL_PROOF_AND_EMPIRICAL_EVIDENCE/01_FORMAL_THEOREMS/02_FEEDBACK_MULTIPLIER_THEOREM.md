# Feedback Multiplier Theorem

## Claim

If exposure produces engagement and engagement produces later exposure, an initial artificial boost can be amplified.

## Model

```text
E_{t+1} = a + bG_t
G_t = pE_t
```

Substitute:

```text
E_{t+1} = a + bpE_t
```

Let `m = bp`. An artificial boost `δ` at `t=0` adds:

```text
δ + mδ + m^2δ + ... + m^Tδ
```

If `0 < m < 1`, total added exposure tends to:

```text
δ / (1 - m)
```

If `m` is close to 1, the multiplier is large; if the system saturates, growth is capped by audience size or throttling.

## Empirical support

Muchnik et al. show accumulating positive herding from artificial votes; van de Rijt et al. show arbitrary early success can increase later success; Chaney et al. show recommender feedback loops can homogenize behaviour.
