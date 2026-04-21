# **Retention Survival Model**

## **Problem**

Short-form performance is not a single binary outcome. Viewers leave at different points. Model retention as survival.

## **Definitions**

```math
T_i = watch time
D_i = video duration
S_i(t) = P(T_i ≥ t)
h_i(t) = dropout hazard at time t
```

## **Hazard model**

```math
h_i(t) = h_0(t) exp(θᵀz_{i,t})
```

Where `z_{i,t}` contains time-varying features:

```text
audio energy
beat change
caption change
visual cut
voice pause
music drop/riser
semantic novelty
SFX event
silence event
```

## **Discrete dropout model**

```math
P(Drop_{i,t}=1) = σ(α_t + θᵀz_{i,t})
```

```math
S_i(t) = Π_{u=1}^{t}(1 - P(Drop_{i,u}=1))
```

## **Retention curve loss**

```math
L_retention = Σ_i Σ_t w_t (r_{i,t} - r̂_{i,t})²
```

Weight early seconds heavily:

```math
w_t = {
  3.0 if t ≤ 3s
  2.0 if 3s < t ≤ 8s
  1.0 if t > 8s
}
```

## **Practical diagnostic use**

| Failure | Likely audio issue | Fix |
|---|---|---|
| low 1s retention | no sonic event | add first sound before 500ms |
| low 3s retention | weak hook/voice | sharper first line, stronger semantic hook |
| mid-clip drop | pacing flat | add beat switch, riser, new section |
| low completion | audio density wrong | simplify mix or improve rhythm |
| low replay | poor loop | reconnect final beat to opening |
