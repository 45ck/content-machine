# Protocol cards

## M-SVT — *Variatio singularis* / Single-variable variant test

```yaml
objective:
  test one creative variable
factor:
  variable being changed
levels:
  A, B, C
constant:
  topic, body, platform, CTA where possible
primary_metric:
  one metric only
guardrail_metrics:
  two to three metrics
readout_windows:
  - 24h
  - 72h
  - 7d
  - 30d
decision:
  scale | iterate | kill | replicate
```

## M-MPT — *Comparatio gemina* / Matched-pair creative twin

Use when exact A/B randomisation is unavailable.

```yaml
control:
  baseline creative
treatment:
  creative variant
matching_rules:
  same topic
  similar duration
  same platform
  similar posting context
  same CTA if possible
minimum:
  3 paired tests before conclusion
```

## M-DOS — *Dosis responsum* / Dose-response test

Use for intensity variables.

```yaml
factor_examples:
  text density
  cut frequency
  video length
  face percentage
  proof density
levels:
  low
  medium
  high
readout:
  look for non-linear effects
```

## M-FAC — *Experimentum factoriale* / Factorial design

Use when interactions matter.

```yaml
factor_1:
  first_frame: face | before_after
factor_2:
  hook: problem | result
factor_3:
  CTA: save | send
design:
  2 x 2 x 2 = 8 variants
warning:
  needs enough posts or paid traffic to avoid noise
```

## M-SGA — *Assay quaesitionis* / Search growth assay

```yaml
search_phrase:
  exact query
alignment:
  spoken hook
  on-screen text
  caption/title
  hashtags
  visual demonstration
readout:
  24h
  7d
  30d
  90d
```

## M-ROB — *Falsificatio robusta* / Robustness and kill test

```yaml
wins:
  views or comments
guardrails:
  completion
  follow conversion
  trust/sentiment
  repeat viewers
kill_if:
  tactic wins starts but loses trust repeatedly
```
