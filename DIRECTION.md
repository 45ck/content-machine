# Direction — Where Content Machine Is Heading

**Status:** Active (adopted 2026-04-21)
**Source:** [`docs/research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md`](docs/research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md)
**Tracking:** Beads epic [`content-machine-7tf`](#phase-plan) (P0)

---

## One-paragraph north star

Content Machine stops trying to be a monolithic "AI content agent" and
becomes a **harness-first content runtime and protocol**. The durable
value is not repo-owned orchestration; it is typed content contracts,
deterministic media execution, evaluation and validation, reverse
engineering of winning content, and reusable content playbooks that
coding harnesses (Claude Code, Codex, OpenCode, and friends) load as
skills. The CLI is demoted to a thin dev/CI shell. MCP is optional
adapter infrastructure, not the center.

## Product boundaries we are moving toward

| Layer         | Role                                            | Canonical location                  |
| ------------- | ----------------------------------------------- | ----------------------------------- |
| Contracts     | Typed content schema (scripts, scenes, renders) | `src/contracts/` (to be extracted)  |
| Runtime       | Deterministic media execution core              | `src/runtime/` (to be extracted)    |
| Scripts/hooks | Reproducible deterministic entry points         | `scripts/`                          |
| Skills        | Harness-facing content intelligence             | `skills/` (new)                     |
| Adapters      | MCP and external-system bridges                 | `connectors/`, optional MCP adapter |
| CLI           | Thin dev/CI shell over the runtime              | `src/cli/`                          |

See [`docs/direction/01-boundaries.md`](docs/direction/01-boundaries.md)
for the full breakdown, including what stays in each layer and what
moves out.

## Phase plan

Sequential. Each phase is a P0 bead and unblocks the next.

| Phase | Bead                                                                            | Outcome                                                |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 0     | [`content-machine-7tf.1`](docs/direction/phases/phase-0-freeze-and-classify.md) | Freeze CLI, classify every surface keep/move/deprecate |
| 1     | [`content-machine-7tf.2`](docs/direction/phases/phase-1-contracts.md)           | Extract typed content contracts into their own package |
| 2     | [`content-machine-7tf.3`](docs/direction/phases/phase-2-runtime.md)             | Extract deterministic runtime/library core             |
| 3     | [`content-machine-7tf.4`](docs/direction/phases/phase-3-scripts.md)             | Build deterministic script/hook surfaces               |
| 4     | [`content-machine-7tf.5`](docs/direction/phases/phase-4-skills.md)              | Ship first harness skills                              |
| 5     | [`content-machine-7tf.6`](docs/direction/phases/phase-5-cli-decision.md)        | Decide CLI fate with trial evidence                    |
| 6     | [`content-machine-7tf.7`](docs/direction/phases/phase-6-story-rewrite.md)       | Rewrite product story + docs to harness-first          |

Run `bd list --priority 0` or `bd show content-machine-7tf` for live state.

## Where to look next

- **Full findings and plan:** [`docs/research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md`](docs/research/external/imports-20260421/CONTENT_MACHINE_FINDINGS_AND_PLAN_2026-04-12.md)
- **Imported research bundle:** [`docs/research/external/imports-20260421/README.md`](docs/research/external/imports-20260421/README.md)
- **Direction folder:** [`docs/direction/`](docs/direction/)
- **Existing architecture docs:** [`docs/dev/architecture/`](docs/dev/architecture/)
- **Phase 0 synthesis (authoritative consolidation):** [`docs/direction/03-reorg-synthesis.md`](docs/direction/03-reorg-synthesis.md)
- **Per-file classification (keep/move/archive/delete):** [`docs/direction/classification-20260422.md`](docs/direction/classification-20260422.md)
- **TypeScript kernel cut line (what survives vs archives):** [`docs/direction/06-typescript-kernel-cut-line.md`](docs/direction/06-typescript-kernel-cut-line.md)
- **Skill catalogue (~35 skills, source-pack-grounded):** [`docs/direction/04-skill-catalog.md`](docs/direction/04-skill-catalog.md)
- **Flow catalogue (10 prompt-language flows):** [`docs/direction/05-flow-catalog.md`](docs/direction/05-flow-catalog.md)
- **Archive policy and landing zone:** [`archive/README.md`](archive/README.md)

## Working agreement: no literal flow DSL in prose docs

Prose documentation that describes flows should use indented plain text or retype gate keywords (e.g. `gate list:` instead of the literal DSL word) to avoid triggering the prompt-language meta-prompt hook during authoring sessions. Executable `.flow` files under `flows/` are unaffected.
