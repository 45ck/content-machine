# Metric and guardrail selection

## Primary metric rule

Each experiment needs one primary metric.

Examples:

```text
First-frame test -> CTV
Hook test -> EHR
Text/caption test -> APV or CPL
Save CTA test -> SAV
Send CTA test -> SND
Search test -> SEA
Follow conversion test -> FOL
Trust/risk test -> TRU
```

## Guardrail rule

Use guardrails to avoid bad incentives.

Examples:

```yaml
primary_metric: CMT
guardrails:
  - CPL
  - FOL
  - TRU
```

This prevents scaling ragebait that wins comments but loses trust.

## Readout windows

```text
24h = early feed test
72h = first stabilisation
7d = short tail
30d = long-tail/search durability
90d = evergreen confirmation
```

## Decision table

| Pattern | Meaning | Action |
|---|---|---|
| High CTV, low EHR | first frame worked; hook failed | rewrite hook |
| High EHR, low CPL | opening worked; body failed | fix pacing/story |
| High CPL, low SAV/SND | watchable but not useful/social | redesign value/CTA |
| High SAV, low FOL | useful video; weak account promise | strengthen series/profile |
| High CMT, low TRU | reaction without trust | kill or reframe |
| Low 24h, high 30d SEA | search video, not feed video | build search lane |
