# CLI Commands Contract

The actual command names can vary by harness. The conceptual commands are:

```text
agent create-campaign <slug>
agent diagnose <campaign-folder>
agent generate-variants <campaign-folder>
agent build-proof-path <campaign-folder>
agent build-platform-packet <campaign-folder>
agent validate-campaign <campaign-folder>
agent update-posterior <campaign-folder>
agent write-learning-memo <campaign-folder>
agent update-memory <campaign-folder>
```

## Output

Every command writes Markdown.

## Failure

If a command cannot complete, it writes:

```text
BLOCKED.md
```

with missing inputs and next action.
