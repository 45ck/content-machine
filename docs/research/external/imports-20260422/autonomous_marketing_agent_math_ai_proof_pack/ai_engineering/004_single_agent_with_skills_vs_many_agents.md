# Single Agent With Skills vs Many Agents

## Default

Use one general agent with strong skills and Markdown memory.

## Why

Marketing strategy, math, copy, measurement, and proof path are interdependent. Fragmenting too early can create shallow handoffs.

## Add subagents when

- tool permissions need separation,
- context windows become overloaded,
- output quality improves from isolated focus,
- the task has a clean boundary,
- one specialist should grade another.

## Recommended

```text
Single main agent
+ skill library
+ optional grading/review subagents
+ optional platform adapter subagents
```

## Anti-pattern

Do not create twelve agents to simulate a marketing department. Build the loop.
