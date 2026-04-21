# Metric codebook

| Code | Metric | What it diagnoses |
|---|---|---|
| CTV | Chose-to-view / viewed-vs-swiped | Scroll-stop / first-frame performance |
| EHR | Early hold rate | 1–3 second retention |
| APV | Average percentage viewed | Whole-video retention quality |
| AVD | Average view duration | Absolute watch time |
| CPL | Completion rate | Finish behaviour |
| RPL | Replay / rewatch rate | Loop/density/reinspection |
| SAV | Save rate | Reference value |
| SND | Send/share rate | Social transmission |
| CMT | Comment rate | Participation, disagreement, confusion, identity |
| FOL | Follow/subscriber conversion | Account promise and repeat value |
| CLK | Profile/click-through | Curiosity and conversion |
| SEA | Search traffic / long-tail | Evergreen discovery |
| TRU | Trust / sentiment / negative feedback | Trust preservation and risk |
| REV | Revenue / conversion | Commercial outcome |
| MIX | Mixed metric readout | Use when more than one signal matters |

## Metric selection rule

Pick one **primary** metric and up to three **guardrail** metrics before posting.

Example:

```yaml
primary_metric: SAV
guardrails:
  - APV
  - TRU
  - FOL
```

Do not scale a tactic that wins the primary metric while repeatedly failing trust or follow-conversion guardrails.
