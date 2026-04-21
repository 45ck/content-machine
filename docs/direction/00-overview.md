# Overview — Harness-first content runtime

## North star

Content Machine is a **harness-first content runtime and protocol**.
It provides the substrate that agentic harnesses (Claude Code, Codex,
OpenCode, and future harnesses) call into when producing short-form
video content. Repo-owned orchestration is no longer the product.

The durable value is:

- typed content contracts
- deterministic media execution
- evaluation and validation
- reverse engineering of winning content
- reusable content playbooks loaded as harness skills
- thin deterministic scripts/hooks around the runtime
- a closed feedback loop from published content back into the next iteration

## What changed during scrutiny

1. The claim that "MCP is dead" did not survive current docs. MCP is
   supported and useful, just not the center. Treat it as optional
   adapter infrastructure.
2. The claim that "everything outside markdown packages is useless"
   was too aggressive. The runtime, the contracts, and a few
   deterministic scripts remain the primary product core.
3. The correct demotion is the **control plane**: the CLI and the
   repo-owned agentic layer, not the runtime.

## Stance on the main surfaces

- **Skills** are the primary intelligence surface. Harnesses load them;
  repo owns the playbook content and the invocation contracts.
- **Runtime / library** is the primary product core. It executes media
  deterministically and is callable from both skills and scripts.
- **Scripts / hooks** are the deterministic execution layer. Thin,
  reproducible, log-structured.
- **CLI** is a thin dev/CI shell. Not a product interface. May shrink
  or be removed after the Phase 5 trial.
- **MCP** is optional adapter infrastructure for external/shared
  systems, not the default integration path.

## Bottom-line decision

Do not archive Content Machine. **Archive the idea that Content
Machine itself should be the main agentic control plane.**

## Source

Lifted from section 2, 6, 7, 8, and 9 of
[`../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md`](../research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md).
