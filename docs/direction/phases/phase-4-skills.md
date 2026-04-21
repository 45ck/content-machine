# Phase 4 — First harness skills

**Bead:** `content-machine-7tf.5` · **Priority:** P0
**Source:** findings doc section 12 Phase 4
**Blocked by:** Phase 3

## Goal

Author the first batch of skills so harnesses own the agentic layer
while calling into the runtime. Each skill must follow the rules in
section 12.4 of the findings doc.

## Skills to create first

1. **Brief → script.** Harness-side skill that turns a topic or
   reference video into a contract-shaped brief, then calls the runtime
   script stack.
2. **Reverse-engineer winner.** Skill that pulls a reference video
   through the runtime analyzers and emits a creative-genome artifact.
3. **Publish-prep review.** Skill that reviews a render output against
   archetype rules and proposes edits.

## Rules for each skill

- Skill descriptions are specific enough that the harness triggers them
  without guessing.
- Skills never duplicate runtime logic. They invoke scripts.
- Skills produce artifacts under `output/` that the runtime can re-consume.
- Each skill has an invocation test.

## Acceptance

- At least three skills shipped under `skills/`.
- Each skill has an invocation test and at least one real content
  artifact produced end-to-end.
- Skill docs live alongside the skill, not in `docs/reference/`.
