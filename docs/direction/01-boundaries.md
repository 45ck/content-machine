# Product Boundaries

The layers, what each owns, and which surface is canonical during the
migration. Derived from section 7 and section 11 of the findings doc.

## Layer map

| Layer         | Owns                                              | Callers                          | Target location |
|---------------|---------------------------------------------------|----------------------------------|-----------------|
| Contracts     | Typed content schema, result shapes, validators   | Runtime, skills, scripts, CLI    | `src/contracts/` package |
| Runtime       | Deterministic media execution, rendering, validation | Scripts, skills, CLI          | `src/runtime/` package |
| Scripts/hooks | Reproducible deterministic entry points           | Harnesses, CI, humans            | `scripts/` |
| Skills        | Harness-facing content playbooks + invocations    | Claude Code / Codex / OpenCode   | `skills/` (new) |
| Adapters      | External-system bridges (MCP, platform connectors)| Runtime (optional)               | `connectors/`, MCP adapter |
| CLI           | Thin dev/CI shell over the runtime                | Humans, CI                       | `src/cli/` (thin) |

## Contract layer

Typed contracts for scripts, scenes, renders, evaluation results, and
validation reports. Everything else depends on this package. Contracts
never import runtime internals.

Keep small, stable, and versioned. Treat as public API.

## Runtime layer

Media execution core: TTS, captions, timing, rendering, concatenation,
QC. Deterministic. Takes a contract in, emits a contract + artifact
out. Can be used offline for fixtures. No agentic reasoning here.

## Scripts / hooks layer

Thin deterministic scripts around the runtime. Examples: ingest a
topic brief, render from a frozen contract, prep a publish payload.
Each script is reproducible, log-structured, and callable from any
harness or CI.

## Skills layer

Harness skills own the agentic layer: brief generation, archetype
selection, hook design, reverse-engineering winners, edit review.
Skills invoke runtime/scripts; they do not re-implement them.

## Adapter layer

Optional bridges:

- MCP for tools the harness should call directly
- platform connectors for upload/publish
- research adapters for external signal sources

Adapters are loadable extensions, not required paths.

## CLI layer

Kept only as a thin dev/CI shell. Not a product surface. Phase 5
decides whether it stays thin, is kept for specific workflows, or is
removed entirely.

## Dependency direction

```
contracts  ←  runtime  ←  scripts  ←  skills
                      ↖           ↙
                       cli (thin)
                   adapters (optional)
```

Nothing below the line imports upward. Skills never reach into runtime
internals; they call scripts or the runtime public API.
