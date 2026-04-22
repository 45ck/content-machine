# <skill-id>

## Summary

One paragraph describing the user-visible job this skill does for a
coding harness.

## Use When

- Concrete trigger phrase or operator intent.
- Concrete trigger phrase or operator intent.

## Do Not Use When

- Case that should stay in the CLI, runtime, or a different skill.
- Case that requires unsupported side effects or missing artifacts.

## Inputs

| Name    | Type     | Required | Description                           |
| ------- | -------- | -------- | ------------------------------------- |
| `topic` | `string` | yes      | Replace with the real input contract. |

Prefer explicit JSON fields over free-form prose. If the skill accepts
files, name the expected path and format.

## Outputs

| Name                | Type     | Description                      |
| ------------------- | -------- | -------------------------------- |
| `artifacts.primary` | `string` | Replace with the primary output. |

## Runtime Surface

- Script or command invoked: `scripts/<replace-me>`
- Runtime module or public API: `<replace-me>`
- Deterministic boundary: explain what is delegated versus what the
  skill decides.

## Artifact Contract

- Working directory assumptions:
- Output directory:
- Files created:
- Files read but not modified:

## Invocation Notes For Harnesses

- Preferred call shape for Claude Code:
- Preferred call shape for Codex CLI:
- Required environment variables:
- Safety or approval boundaries:

## Constraints

- Hard limits, latency/cost notes, model requirements, or platform
  assumptions.

## Validation

- Minimum smoke check:
- Expected structured success signal:
- Expected failure signal:

## Related Docs

- Direction or architecture links that ground this skill.
