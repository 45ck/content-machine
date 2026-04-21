---
name: no-conversion-debugger
description: Diagnose no-conversion or low-conversion campaigns and turn failure into next tests. Trigger: Campaign has spend or traffic without enough downstream signal.
---
# no-conversion-debugger

## Trigger

Campaign has spend or traffic without enough downstream signal.

## Goal

Diagnose no-conversion or low-conversion campaigns and turn failure into next tests.

## Process

1. Load relevant product facts and memory files.
2. Diagnose buyer state and funnel layer.
3. Select or modify the tactic.
4. Produce Markdown artifacts, not just advice.
5. Define measurement and next action.
6. Update memory or prepare memory updates.

## Required output

```text
Decision:
Assumptions:
Artifacts created:
Campaign or test plan:
Measurement plan:
Kill/scale rule:
Memory update:
Next action:
```

## Completion rule

Do not mark complete unless a concrete Markdown artifact exists.
