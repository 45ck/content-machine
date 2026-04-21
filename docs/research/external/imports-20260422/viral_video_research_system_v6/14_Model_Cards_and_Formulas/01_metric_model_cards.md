# Metric model cards

## CTV / chose-to-view

```text
Type: binary rate
Model: Beta-Binomial
Primary use: first-frame and topic-scent tests
Guardrails: EHR, CPL, TRU
```

## EHR / early hold rate

```text
Type: binary rate
Model: Beta-Binomial
Primary use: hook tests
Guardrails: APV, CPL
```

## APV / average percentage viewed

```text
Type: continuous bounded metric
Model: bootstrap / robust normal approximation
Primary use: retention/pacing/story tests
Guardrails: SAV, SND, TRU
```

## SAV / save rate

```text
Type: binary/count rate
Model: Beta-Binomial or Poisson rate
Primary use: utility/checklist/template tests
Guardrails: FOL, TRU
```

## SND / send-share rate

```text
Type: binary/count rate
Model: Beta-Binomial or Poisson rate
Primary use: identity/social-transfer tests
Guardrails: sentiment/trust
```

## FOL / follow conversion

```text
Type: binary/count rate
Model: Beta-Binomial
Primary use: series/account-promise tests
Guardrails: topic fit, trust
```
