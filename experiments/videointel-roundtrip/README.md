# VideoIntel Round-Trip Experiment

Tests the full bridge pipeline end-to-end:

```
VideoSpec.v1 → classify → VideoTheme.v1 → blueprint → VideoBlueprint.v1 → prompt context
```

## What it verifies

1. Each pipeline step completes without errors
2. Blueprint context string is well-formed for LLM consumption
3. Archetype flows correctly through the chain
4. Scene count and duration are preserved
5. Context string has expected structural elements

## Running

```bash
npx tsx experiments/videointel-roundtrip/run.ts
```
