---
name: <skill-id>
description: One-sentence summary of the skill for a coding agent.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{}'
entrypoint: node --import tsx scripts/harness/<entrypoint>.ts
inputs:
  - name: exampleInput
    description: Replace with the real input shape.
    required: true
outputs:
  - name: output.json
    description: Replace with the real output file.
---

# <Skill Name>

## Use When

- Describe when the skill should trigger.
- Describe the main job it completes.

## Invocation

```bash
cat <<'JSON' | node --import tsx scripts/harness/<entrypoint>.ts
{}
JSON
```

## Output Contract

- Describe what files are written.
- Describe any required upstream files.
- Describe the JSON envelope returned on stdout.

## Validation Checklist

- List the concrete checks that prove the skill worked.
