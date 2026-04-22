# <flow-name>

## Purpose

One sentence describing the operator job this flow completes.

## Status

- Phase:
- Status:
- Owner:

## Inputs

| Name    | Type     | Required | Description                           |
| ------- | -------- | -------- | ------------------------------------- |
| `topic` | `string` | yes      | Replace with the real input contract. |

## Outputs

| Path or Value               | Description                        |
| --------------------------- | ---------------------------------- |
| `runs/<run-id>/output.json` | Replace with the primary artifact. |

## Skills Or Sub-Flows Called

- `skill-or-sub-flow-name`: why it is called and what it returns.

## Control Flow

Describe the orchestration in plain English. Keep it readable by humans
and safe for tooling that scans for executable prompt-language files.

Suggested details:

- order of operations
- retry boundaries
- branch conditions
- concurrency ceiling

## Completion Gates

- Structured condition that must be true for success.
- Structured condition that must be true for success.

## Failure Modes

- Expected failure and how the flow reports it.
- Expected failure and how the flow reports it.

## Artifact Contract

- Run directory:
- Files created:
- Files reused:
- Cleanup expectations:

## Harness Notes

- How Claude Code should treat this flow:
- How Codex CLI should treat this flow:
- Human override points:

## Related Docs

- Direction, architecture, or skill docs that ground this flow.
