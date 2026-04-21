# Agent Memory and Learning System

## Purpose

The factory should not relearn the same thing every week. It needs durable memory.

## Memory types

### Factual memory

- product facts,
- claims,
- proof,
- limitations,
- pricing,
- platform IDs.

### Strategic memory

- positioning decisions,
- rejected angles,
- ICP definitions,
- category beliefs,
- key objections.

### Experimental memory

- hypotheses,
- test designs,
- results,
- confidence,
- next actions.

### Creative memory

- winning hooks,
- losing hooks,
- fatigue patterns,
- effective visual metaphors,
- banned styles.

## Learning memo fields

```json
{
  "experiment_id": "EXP-001",
  "hypothesis": "Permission preview increases trial starts among privacy-sensitive visitors",
  "result": "inconclusive",
  "confidence": "low",
  "primary_metric": "activated_trials_per_1000_clicks",
  "what_worked": "Higher demo completion",
  "what_failed": "No lift in signup completion",
  "what_not_to_conclude": "Do not conclude privacy proof is unimportant; traffic may have been too cold.",
  "next_test": "Move permission preview below a shorter product demo"
}
```

## Memory retrieval rules

Before generating an ad, retrieve:

- relevant product claims,
- prior tests for same buyer state,
- prior tests for same objection,
- channel-specific constraints,
- active brand rules,
- recent fatigue patterns.

## Staleness rules

Mark memories stale when:

- product changed,
- pricing changed,
- claim expired,
- platform policy changed,
- channel algorithm changed materially,
- audience changed,
- result is older than agreed window.

## Mindset

The point of autonomy is compounding learning, not compounding random generation.
