# Analysis Plan

## Core model

Use mixed-effects models for repeated-measure designs:

```text
outcome ~ condition + video_type + viewing_mode + visual_load + condition:video_type + (1|participant_id) + (1|video_id)
```

## Planned contrasts

1. SCC vs FTO — compression proof.
2. BCC vs SCC — bionic anchor proof.
3. BCC+ vs BCC — system proof.
4. BCC vs HBC — sparse anchor proof against heavy bionic negative control.
5. GSP vs BFP — placement proof.
6. VLAC vs fixed density — adaptive density proof.
7. PSP vs sync/post — predictive timing proof.

## Practical thresholds

| Outcome | Minimum practical movement |
|---|---:|
| Gist/action recall | +5 percentage points |
| Perceived effort | −0.3 on 7-point scale |
| Completion | +3 percentage points |
| Confusion comments | no increase |
| Visual recall | no meaningful decline |
| Accessibility | no regression |

## Reporting

Report:

- effect size;
- confidence interval;
- practical threshold;
- segment breakdown;
- guardrail outcomes;
- failures and unexpected results.

Do not report a method as proven if it only wins on a metric it was not designed to improve.
