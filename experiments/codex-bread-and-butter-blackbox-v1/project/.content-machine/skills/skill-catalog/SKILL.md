---
name: skill-catalog
description: Enumerate the repo-local skills, entrypoints, inputs, and example requests so Claude Code or Codex can discover the shipped skill surface without reading every folder manually.
allowedTools:
  - shell
  - read
model: inherit
argumentHint: '{"skillsDir":"skills","includeExamples":true}'
entrypoint: node ./node_modules/@45ck/content-machine/agent/run-tool.mjs skill-catalog
inputs:
  - name: skillsDir
    description: Root skills directory to scan for SKILL.md manifests.
    required: false
  - name: includeExamples
    description: Include `examples/request.json` paths when they exist.
    required: false
outputs:
  - name: skills[]
    description: List of skill manifests with entrypoints, inputs, outputs, and optional example request paths.
---

# Skill Catalog

## Use When

- Claude Code or Codex needs to discover the shipped repo-local skills
  before choosing one.
- The agent wants a structured catalog instead of scraping markdown by
  hand.
- The user asks what skills are available in this repository right now.

## Invocation

```bash
cat experiments/codex-bread-and-butter-blackbox-v1/project/.content-machine/skills/skill-catalog/examples/request.json | \
  node ./node_modules/@45ck/content-machine/agent/run-tool.mjs skill-catalog
```

## Output Contract

- Reads the `skills/` tree and parses each `SKILL.md` frontmatter.
- Skips `skills/_template/` unless explicitly requested.
- Returns the manifest path, entrypoint, tool list, input/output
  summary, and optional `examples/request.json` path for each skill.

## Validation Checklist

- `skillCount` matches the number of shipped skills under `skills/`.
- Each returned skill has a valid `name`, `description`, and
  `entrypoint`.
- Example request paths are only returned when the file actually exists.
