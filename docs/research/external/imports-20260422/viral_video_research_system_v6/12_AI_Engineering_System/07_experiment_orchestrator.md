# Experiment orchestrator

## Responsibilities

```text
assign experiment ID
attach hypothesis ID
select method
define variants
set primary metric
set guardrails
set checkpoints
route exposure
collect data
run Bayesian update
issue kill/replicate/scale recommendation
```

## Experiment object

```json
{
  "experiment_id": "EXP-20260421-YTS-SHRT-ATT.PRIM-M-MPT-FRAME5",
  "hypothesis_id": "H091",
  "method": "M-MPT",
  "platform": "YTS",
  "surface": "SHRT",
  "primary_metric": "CTV",
  "guardrails": ["CPL", "TRU"],
  "variants": ["A", "B", "C", "D", "E"],
  "checkpoints": ["24h", "72h", "7d", "30d"]
}
```

## Orchestration rule

No variant is published without an experiment object.
