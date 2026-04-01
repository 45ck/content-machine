# VideoIntel V&V Experiment

Verification and Validation of the videointel classify + blueprint pipeline.

## What it tests

Given a VideoSpec.v1 with known properties (ground truth), does the pipeline:

1. **Classify** the video into the correct archetype, purpose, format, style?
2. **Extract** a blueprint with accurate scene structure, audio/caption/pacing profiles?

## Fixtures (9 archetypes)

| Fixture      | Archetype          | Key Signal                               |
| ------------ | ------------------ | ---------------------------------------- |
| listicle     | listicle           | "First... Second... Third..."            |
| howto        | howto              | "Step 1... Step 2... Step 3..."          |
| versus       | versus             | "vs", "better than"                      |
| reaction     | reaction           | 2+ inserted content blocks               |
| compilation  | montage            | 20 shots, no transcript, music           |
| story        | story              | "One day", "journey", "experience"       |
| hot-take     | hot-take           | Short + "unpopular opinion"              |
| myth         | myth               | "misconception", "debunk", "actually"    |
| talking-head | listicle (default) | Single shot, narration, no strong signal |

## Running

```bash
# Full run
npx tsx experiments/videointel-vv/run.ts

# Verbose (show all check details)
npx tsx experiments/videointel-vv/run.ts --verbose

# Single fixture
npx tsx experiments/videointel-vv/run.ts listicle
```

## Current results

```
Overall: 99/99 checks passed (100.0%)
Fixtures: 9/9 perfect
```
