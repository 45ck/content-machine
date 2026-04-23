---
name: brief-to-script
description: Turn a topic, packaging hint, or blueprint into a script file that the rest of the pack can use.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"topic":"Redis vs PostgreSQL for caching","archetype":"versus","targetDuration":35,"outputPath":"output/content-machine/script/script.json"}'
entrypoint: node --import tsx scripts/harness/brief-to-script.ts
inputs:
  - name: topic
    description: Short brief or topic string to turn into a script.
    required: true
  - name: archetype
    description: Script archetype such as listicle, versus, or howto.
    required: false
  - name: blueprintPath
    description: Optional VideoBlueprint.v1.json to constrain pacing and structure.
    required: false
outputs:
  - name: script.json
    description: Script file written to the requested output path.
---

# Brief To Script

## Use When

- The user wants a fresh script from a topic or short brief.
- The agent already has packaging, research, or blueprint files and
  needs the next script file.
- Claude Code or Codex should produce a reusable `script.json` rather
  than freeform prose.

## Invocation

Pipe JSON to the repo-side entrypoint:

```bash
cat <<'JSON' | node --import tsx scripts/harness/brief-to-script.ts
{
  "topic": "Redis vs PostgreSQL for caching",
  "archetype": "versus",
  "targetDuration": 35,
  "outputPath": "output/content-machine/script/script.json"
}
JSON
```

## Output Contract

- Writes one `script.json` file to the requested `outputPath`.
- If `packagingPath`, `researchPath`, or `blueprintPath` are supplied,
  they must already exist.
- Returns a JSON envelope describing the output path and scene count.

## Validation Checklist

- `outputPath` exists.
- Script title and scene count are non-empty.
- If a blueprint was provided, downstream checks should confirm the
  generated script still matches that blueprint.
