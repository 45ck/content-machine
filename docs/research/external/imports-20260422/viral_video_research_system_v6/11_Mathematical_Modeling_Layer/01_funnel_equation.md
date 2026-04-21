# Funnel equation

## Gate model

For a video `v`, define:

```text
E_v   = exposures / shown in feed / impressions
CTV_v = P(viewer chooses to view | exposure)
EHR_v = P(viewer holds first 3 seconds | chose to view)
RET_v = average percentage viewed
CPL_v = completion probability
RPL_v = replay probability
SAV_v = save probability
SND_v = send/share probability
CMT_v = comment probability
FOL_v = follow/subscription probability
SEA_v = search long-tail rate
TRU_v = trust / sentiment guardrail
```

A simple expected value model:

```text
Expected meaningful actions_v =
E_v × CTV_v × EHR_v × [
  w_ret × RET_v
+ w_cpl × CPL_v
+ w_rpl × RPL_v
+ w_sav × SAV_v
+ w_snd × SND_v
+ w_cmt × CMT_v
+ w_fol × FOL_v
+ w_sea × SEA_v
]
```

## Practical utility score

Use a normalised utility score:

```text
U_v = Σ_m w_m × z_m(v) - Σ_g λ_g × guardrail_penalty_g(v)
```

Where:

```text
m = metric
w_m = strategic weight for that metric
z_m(v) = standardised metric compared to baseline
λ_g = penalty weight for guardrail breach
```

## Example strategic weights

For an education/account-building channel:

```text
CTV: 0.15
EHR: 0.10
APV: 0.15
CPL: 0.10
SAV: 0.20
SND: 0.10
FOL: 0.15
SEA: 0.05
```

For a sendable/social Reels strategy:

```text
CTV: 0.10
EHR: 0.10
APV: 0.10
CPL: 0.05
SAV: 0.10
SND: 0.35
CMT: 0.10
FOL: 0.10
```

## Gate diagnosis

```text
If CTV fails: first frame / visual clarity / topic scent failed.
If EHR fails: hook failed.
If APV/CPL fails: story/pacing/payoff failed.
If SAV fails: utility/reusability failed.
If SND fails: social transfer failed.
If FOL fails: account/series promise failed.
If SEA fails: search alignment failed.
If TRU fails: clickbait/trust risk failed.
```
