# Lightweight preregistration template

Use before posting any serious test.

```yaml
experiment_code:
date_registered:
owner:
platform:
surface:
content_form:
hypothesis_id:
formal_code:
scientific_name:
method_code:
primary_research_question:

hypothesis:
  if:
  then:
  because:

factor:
  name:
  levels:
    - A:
    - B:
    - C:

constants:
  topic:
  body:
  length:
  CTA:
  posting_window:
  caption_style:
  other:

primary_metric:
guardrail_metrics:
  - 
  - 
  - 

readout_windows:
  - 24h
  - 72h
  - 7d
  - 30d

decision_rules:
  scale_if:
  iterate_if:
  kill_if:
  replicate_if:

notes:
```

## Minimum evidence rule

One result is a signal, not a conclusion.

```text
1 win = interesting
2 wins = promising
3 wins across different examples = mechanism candidate
replicated across platforms = scalable playbook
```
