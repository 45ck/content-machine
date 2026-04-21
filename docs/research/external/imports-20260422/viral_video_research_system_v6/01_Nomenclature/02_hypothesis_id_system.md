# Hypothesis ID system

## Canonical format

```text
H001–H435
```

Do not reuse IDs. If a hypothesis is retired, keep the ID and mark it as `retired`.

## Full record format

Each hypothesis should eventually have:

```yaml
id: H001
legacy_id: H1
formal_code: AVT-SEA-QUAE-001
scientific_name: "*Quaeribilitas quaesitiva* var. h001-topic-beats-broad"
family_code: SEA
family: Search / long-tail demand
hypothesis: Specific topic beats broad topic.
primary_metric: search traffic, saves
suggested_method: M-SGA
status: proposed | active | tested | replicated | retired
```

## Status labels

| Status | Meaning |
|---|---|
| `proposed` | Hypothesis exists but no primary data yet. |
| `active` | Test is planned or running. |
| `tested` | One readout exists. |
| `replicated` | Same mechanism won across at least two independent tests. |
| `retired` | Failed enough times or became irrelevant. |
| `unsafe` | Not worth using due to trust, policy, or brand risk. |
