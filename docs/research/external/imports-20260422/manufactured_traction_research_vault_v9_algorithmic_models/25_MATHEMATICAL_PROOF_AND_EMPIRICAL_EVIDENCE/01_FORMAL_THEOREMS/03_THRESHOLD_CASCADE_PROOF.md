# Threshold Cascade Proof

## Claim

When users act only after visible popularity crosses a personal threshold, an artificial seed can trigger real adoption if it pushes enough users past those thresholds.

## Model

Each user `u` adopts when observed adoption fraction exceeds threshold `θ_u`:

```text
adopt_u = 1 if observed_fraction_u >= θ_u
```

Let `F(x)` be the fraction of users whose thresholds are at or below observed adoption `x`:

```text
x_{t+1} = F(x_t)
```

Artificial seed `s` changes the initial state:

```text
x_0 = real_seed + s
```

If `x_0` crosses enough low thresholds, a cascade can occur.

## Sources

Granovetter's threshold model explains how threshold distributions determine equilibrium participation. Watts' global-cascade model shows small shocks can trigger rare large cascades in random networks under certain structural conditions.
