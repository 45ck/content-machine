# ADR: Default to TUI When No Args (20260110)

**Status:** Proposed  
**Date:** 2026-01-10  
**Owners:** Unassigned

---

## Context

`content-machine` is designed as a CLI pipeline, but the most common user journey is interactive exploration:

- Users often start with "I have a topic, what do I do next?"
- The pipeline has many flags and quality presets that are hard to discover via `--help`.
- There is already a clear stdout/stderr separation and an event system suitable for richer UX.

We want the default entry experience to feel "app-like" while preserving the scripted/headless CLI contract.

Constraints:

- Must not break `--json` mode or automation workflows.
- Must remain usable in non-TTY contexts (CI, pipes).
- Must not intermix multiple redraw systems (Ink vs ora/log-update).

## Decision

When `cm` is invoked with no positional arguments:

- If running in a TTY and not in JSON mode, launch the interactive TUI home screen.
- Otherwise (non-TTY or `--json` or `--no-tui`), print help or a concise usage error and exit.

Add escape hatches:

- `--no-tui` global option
- `CM_DISABLE_TUI=1` environment variable

Keep all existing subcommands (`cm generate`, `cm script`, etc.) unchanged and fully scriptable.

## Consequences

### Positive

- "Zero-friction" entrypoint: `cm` becomes a discoverable app.
- Better UX for multi-step workflows (generate -> validate -> score -> publish).
- Leverages existing event architecture for progress + cost, improving trust.

### Negative / Trade-offs

- Behavior change: `cm` no longer prints help by default in TTY environments.
- Requires careful terminal ownership to avoid conflicting renderers.
- Some users may dislike interactive defaults; mitigated via `--no-tui` and env flag.

## Alternatives Considered

1. **Keep current behavior (`cm` prints help)**
   - Lower risk, but poor discoverability and weaker "product" feel.
2. **Always require `cm ui`**
   - Safer rollout, but misses the "default is delightful" goal.
3. **Wizard prompts (inquirer) instead of full-screen TUI**
   - Simpler, but less powerful for previews, navigation, and live progress.

## Implementation Notes

- Route selection happens in `src/cli/index.ts` based on args + TTY + flags.
- TUI should subscribe to `PipelineEventEmitter` and reuse `CostTrackerObserver`.
- Avoid `ora`/`listr2` in TUI mode; Ink owns rendering.
- Preserve stdout/stderr contract:
  - TUI renders to stderr or takes over terminal
  - stdout remains reserved for machine-readable outputs
- Validate CLI packaging early: the current `dist/cli/index.cjs` output and externalized dependencies must be compatible with any ESM-only UI libs.

## Related

- Docs: `docs/dev/features/feature-cli-tui-mode-20260110.md`
- Guide: `docs/dev/guides/guide-cli-tui-mode-20260110.md`
- Task: `tasks/todo/TASK-018-feature-cli-tui-default-mode-20260110.md`
