# Content Machine — Consolidated Findings, Scrutiny, and Action Plan

Prepared: 2026-04-12  
Scope: Consolidated findings from the full discussion so far, plus current-source verification of Claude Code, Codex, OpenCode, MCP, and the present Content Machine repo shape.

---

## 1. Why this document exists

This file packages the conclusions from the discussion into one durable artifact. It is intended to be the working strategic brief for the next phase of Content Machine.

This is not a neutral “options memo.” It is a directional plan.

The goal is to answer five things clearly:

1. What Content Machine actually is today.
2. Why it currently feels outdated.
3. What should be kept, moved, or deprecated.
4. Whether CLI / MCP / skills should sit at the center.
5. What exact actions and tests should be run next while still shipping real content.

---

## 2. Executive summary

### Core conclusion

Content Machine should stop being positioned as a monolithic “AI content generator” and should become a **harness-first content runtime and protocol**.

The durable value is not repo-owned orchestration.

The durable value is:

- typed content contracts
- deterministic media execution
- evaluation and validation
- reverse-engineering of winning content
- reusable content playbooks that harnesses can load as skills
- thin deterministic scripts/hooks around the runtime
- a closed feedback loop from published content back into the next iteration

### Stronger restatement

Content Machine should not try to be the main “agent.”

The coding harnesses already own that layer better:

- Claude Code
- Codex
- OpenCode
- likely other harnesses over time

Those surfaces already support:

- persistent repo guidance
- on-demand skills
- specialized agents/subagents
- shell execution
- deterministic hooks/scripts
- optional MCP for external systems

So the future is not:

> “Use Content Machine as the content agent.”

The future is:

> “Use Content Machine as the content runtime, schema layer, evaluator stack, and reference-analysis substrate that agentic harnesses call into.”

### Practical implication

- **Skills** become the primary home for content intelligence.
- **Runtime/library + scripts** become the primary home for deterministic execution.
- **CLI** gets demoted to a thin compatibility/dev/CI shell and may be deleted as a primary interface.
- **MCP** is not the center. It is optional adapter infrastructure for external/shared systems.

### Bottom-line decision

Do **not** archive Content Machine.

Archive the idea that Content Machine itself should be the main agentic control plane.

---

## 3. What changed during scrutiny

Several positions were refined during the discussion.

### 3.1 Position that survives scrutiny

The earlier instinct was correct that a large amount of Content Machine’s current value is being eaten by coding harnesses.

Anything that looks like:

- “topic in, workflow routing happens here”
- “research here”
- “script here”
- “package/publish here”
- “agentic generate everything here”

is now directly in the blast radius of Claude Code / Codex / OpenCode + skills + repo guidance + shell access.

That part is real.

### 3.2 Position that needed correction

The stronger claim that “MCP is dead” did not survive contact with current official docs.

The docs do **not** show MCP as replaced or abandoned. They show it as a supported extension point for tools/context, especially for systems outside the local workspace.

So the corrected position is:

- MCP is **not dead**
- MCP is **not the right center**
- MCP should be treated as **optional adapter infrastructure**
- skills + scripts + runtime packages should be the main product boundary

### 3.3 Position that was too extreme

The stronger claim that “everything outside markdown packages is useless” is also too aggressive.

Markdown-only skills are not enough.

You still need real deterministic execution for:

- rendering
- validation
- scoring
- artifact transformations
- reverse-engineering
- CI reproducibility
- fixture generation
- output schemas

So the corrected shape is not “skills only.”

It is:

- **skills for judgment/procedure**
- **runtime packages + scripts for execution**
- **optional MCP for external systems**
- **optional thin CLI for dev/CI compatibility only**

---

## 4. What Content Machine is today

Content Machine currently presents itself publicly as:

- CLI-first
- one command in, vertical video out
- a 4-stage pipeline:
  - topic
  - script
  - audio + timestamps
  - visuals
  - video.mp4

It also explicitly marks itself as **early development**.

At the same time, the repo is already much broader than that public story. The repository contains:

- docs
- evals
- evaluations
- experiments
- registry
- tasks
- tests
- reference docs
- assets/templates
- multiple content/analysis commands

So the repo is currently carrying more than one identity at once:

1. a user-facing content generator
2. a content/media runtime
3. an internal experimentation lab
4. a workflow/orchestration shell
5. an evaluation system

That identity sprawl is a major reason it feels outdated. The repo center of gravity is unclear.

---

## 5. Why Content Machine feels outdated

It feels outdated for structural reasons, not because the whole repo is bad.

### 5.1 The control plane is being commoditized

Current coding harnesses already support:

- repo-level guidance
- on-demand skills
- specialized subagents
- shell commands
- deterministic hooks
- external connectors/tool bridges

That means the old value proposition of “a repo with prompts + workflows + wrappers + orchestration” is weakening fast.

### 5.2 The wrong layer is still too prominent

The current public story still emphasizes:

- the CLI
- one command generation
- end-to-end orchestration inside the product

But the harder-to-commodity assets are elsewhere:

- artifact schemas
- reverse-engineering
- scoring
- validation
- template/runtime execution
- media transformations
- reproducible tests/evals

### 5.3 Repo-owned inference has the weakest moat

Inference that happens inside a monolithic app shell is the least durable part.

If Claude Code / Codex / OpenCode can reason over the repo, load skills, call scripts, and edit artifacts directly, then hidden repo-owned orchestration is strategically weak unless it encodes a genuinely unique evaluator or analysis method.

### 5.4 The product story has not caught up to the ecosystem

The ecosystem now says:

- put durable guidance in `AGENTS.md` / `CLAUDE.md`
- put repeatable procedures in skills
- use scripts/hooks for deterministic mechanics
- use tool bridges only where necessary
- let the harness own the session and orchestration

Content Machine still reflects an earlier “standalone agent app” frame more than it should.

---

## 6. The strategic north star

### New identity

Content Machine should become:

> **A harness-ready short-form content runtime, schema layer, evaluator stack, and reference-analysis toolkit.**

That means:

- no hidden “main agent brain”
- no monolithic orchestration-first product identity
- no assumption that users should enter through `cm generate`
- strong typed contracts
- strong runtime surfaces
- strong evaluators
- strong reference analysis
- strong skill packs for external harnesses

### The product boundary

#### What Content Machine should own

- content artifact schemas
- render/runtime tooling
- media transformation tooling
- validation
- scoring
- reference reverse-engineering
- template mechanics
- deterministic scripts
- CI/test fixtures
- optional bridge layers

#### What harnesses should own

- topic ideation
- research synthesis
- script writing
- packaging/publish procedures
- creative iteration
- postmortems
- reference-guided remakes
- workflow adaptation
- execution planning

---

## 7. The architecture decision

## 7.1 Recommended end-state

### A. Skills as the primary intelligence surface

Skills should become the main interface for:

- shortform-topic-selection
- shortform-script-from-brief
- shortform-remake-from-reference
- shortform-packaging
- shortform-postmortem
- shortform-publish-checklist

These are judgment-heavy, context-heavy, and playbook-heavy. That is exactly what skills are for.

### B. Runtime/library as the primary product core

This is the real moat.

The runtime should own:

- artifact schemas
- render pipeline
- template handling
- timing/caption/audio transforms
- scoring
- validation
- videospec/reference analysis
- deterministic helper utilities

### C. Scripts/hooks as the deterministic execution layer

Scripts should handle:

- render
- validate
- smoke tests
- fixture generation
- packaging of outputs
- CI entrypoints
- local repeatability
- hooks for quality gates

### D. MCP only as an adapter layer

Use MCP only when you need to cross into systems outside the immediate repo/runtime boundary, for example:

- browser-based platform tooling
- Figma/design tools
- analytics dashboards
- remote shared services
- future publishing adapters
- shared internal services

Do **not** make MCP the center of Content Machine.

### E. Thin optional CLI, not a product CLI

Keep a CLI only if it continues to earn its keep for:

- CI
- local smoke tests
- manual fallback
- packaging
- fixture generation
- migration compatibility

If those uses disappear, remove it.

---

## 8. Exact stance on CLI

## 8.1 What should be assumed now

A broad standalone user-facing Content Machine CLI is **probably not** the right long-term interface.

Why:

- the operator is already inside Claude Code / Codex / OpenCode
- those tools already own the terminal surface
- they already provide context, planning, execution, and memory layers
- they already load repo guidance and skills
- they can already call scripts directly

### 8.2 What is still likely needed

A thin CLI may still be justified if it does any of the following better than direct script/package calls:

- stable CI entrypoint
- manual smoke-test entrypoint
- convenient fixture generation
- fallback for non-harness use
- legacy compatibility during migration

### 8.3 Decision rule

Delete the **public primary CLI** if all of these become true:

- operators are using harnesses directly
- skills express the workflow cleanly
- scripts/package APIs handle execution cleanly
- CI no longer depends on CLI ergonomics
- no external users need a stable binary

Keep a **thin internal/dev CLI** if any of these remain true:

- CI needs one stable command
- manual smoke testing benefits from one command
- a migration bridge is still useful
- some package surfaces are still awkward to call directly

---

## 9. Exact stance on MCP

## 9.1 The corrected position

MCP is not dead.

But it should not be the main strategic center.

### 9.2 Use MCP when

Use MCP for:

- external tools
- shared systems
- remote services
- cross-product or cross-process integrations
- systems that are not cleanly modeled as local scripts/package APIs

### 9.3 Do not use MCP when

Do not center MCP for:

- core local runtime logic
- the main product identity
- anything that is better modeled as a package or script
- purely internal deterministic mechanics

### 9.4 What this means for Content Machine

If Content Machine keeps any MCP at all, it should be:

- small
- optional
- adapter-like
- clearly secondary to skills + runtime + scripts

---

## 10. What should stay, move, and de-emphasize

## 10.1 Keep in the core

These look like durable core assets:

- artifact contracts
- stage schemas
- scene/timeline outputs
- audio/timestamps outputs
- visuals plans
- render outputs
- template mechanics
- media assembly/transforms
- reverse-engineering (`videospec`)
- scoring
- validation
- reproducible tests/evals
- packaging as a runtime/library

## 10.2 Move to skills / harness layer

These are better expressed as skills:

- topic ideation
- trend interpretation
- research summarization
- script drafting
- packaging/title/hook generation
- publish preparation
- postmortem analysis
- remake procedures
- variant generation
- platform-specific playbooks

## 10.3 Deprecate or freeze first

These are the strongest candidates for immediate de-emphasis:

- broad orchestration-heavy `generate` as the main identity
- research as a core product story
- workflow routing as a core product story
- any generic retrieval prototype
- internal process systems as part of the public product surface

---

## 11. Internal package structure to move toward

Keep one repo for now, but split it internally.

```text
packages/
  contracts/
  runtime/
  scripts/
  cli-legacy/         # optional, thin, temporary
skills-src/
  shortform-topic-selection/
  shortform-script-from-brief/
  shortform-remake-from-reference/
  shortform-packaging/
  shortform-postmortem/
  shortform-publish-checklist/
.claude/skills/       # generated/symlinked
.agents/skills/       # generated/symlinked
.opencode/skills/     # generated/symlinked if useful
docs/
  architecture/
  testing/
  content-ops/
examples/
  claude/
  codex/
  opencode/
```

### Ownership by package

#### `packages/contracts`
Owns:

- zod/typescript schemas
- versioned artifacts
- validation types
- content contracts
- report/performance schemas

#### `packages/runtime`
Owns:

- render execution
- audio/timing transforms
- visual composition helpers
- template runtime
- videospec analysis
- scoring
- validation

#### `packages/scripts`
Owns:

- shell entrypoints
- CI helpers
- local reproducibility commands
- fixture generation
- hook-friendly deterministic actions

#### `packages/cli-legacy`
Owns only:

- compatibility wrappers
- minimal local/manual flows
- transition entrypoints

No new strategic feature work should be centered here.

#### `skills-src`
Owns:

- playbooks
- reusable procedures
- judgment-heavy tasks
- content operations
- harness-native intelligence

---

## 12. The exact plan

## Phase 0 — Freeze and classify

### Actions

1. Freeze new feature work on orchestration-heavy CLI surfaces.
2. Write an explicit keep/move/deprecate matrix.
3. Tag the current repo state as the legacy baseline.
4. State in docs that the future direction is runtime + skills, not monolithic orchestration.
5. Create this architecture decision as a tracked repo document.

### Deliverables

- `docs/architecture/content-machine-runtime-pivot.md`
- `docs/architecture/keep-move-deprecate.md`

---

## Phase 1 — Extract contracts

### Actions

1. Create `packages/contracts`.
2. Move canonical artifact schemas there.
3. Add versioned schema exports.
4. Add a new `performance-report.v1.json` schema for post-publication analytics.
5. Ensure contracts can be consumed without dragging in provider/inference dependencies.

### Why first

This gives the rest of the system a hard boundary.

If the artifact layer is not clean, the runtime/skills split will remain fuzzy.

### Tests

- roundtrip schema tests
- invalid fixture rejection tests
- version compatibility checks
- golden fixture validation

---

## Phase 2 — Extract runtime

### Actions

1. Create `packages/runtime`.
2. Move in:
   - render
   - template mechanics
   - scoring
   - validation
   - videospec/reference analysis
   - timing/audio transforms
   - visual plan helpers
3. Remove orchestration concerns from runtime.
4. Keep provider-specific reasoning adapters out of the runtime wherever possible.

### Why second

Once the runtime is clean, skills can call it without importing the old app brain.

### Tests

- smoke render test
- score test
- validate test
- videospec test on fixed media fixtures
- template render fixture
- backward compatibility import tests

---

## Phase 3 — Build deterministic script surfaces

### Actions

1. Add shell/node scripts for deterministic mechanics.
2. Use them for:
   - render
   - validate
   - fixture generation
   - smoke tests
   - package outputs
3. Make these script entrypoints the preferred automation boundary.

### Principle

Let the model decide **when** to use them.  
Let scripts determine **how** the deterministic part executes.

### Tests

- script invocation snapshot tests
- CI execution
- cross-platform smoke checks where possible

---

## Phase 4 — Build the first skills

### Skills to create first

1. `shortform-topic-selection`
2. `shortform-script-from-brief`
3. `shortform-remake-from-reference`
4. `shortform-packaging`
5. `shortform-postmortem`
6. `shortform-publish-checklist`

### Rules for each skill

- one job
- clear trigger description
- explicit inputs and outputs
- use scripts/runtime for deterministic steps
- keep the `SKILL.md` focused
- add examples only when they sharpen triggering

### Tests

Each skill gets:

- 10–20 prompt evals
- positive triggers
- negative controls
- artifact-shape checks
- manual first-run validation

---

## Phase 5 — Decide the CLI fate with evidence

Run a **zero-public-CLI trial**.

### During the trial

Create content only through:

- Claude Code / Codex / OpenCode
- repo guidance
- skills
- package APIs
- deterministic scripts

### Track

- time from brief to usable script
- time from script to publishable output
- number of manual corrections
- number of times a standalone CLI was genuinely needed
- number of times scripts alone were enough
- CI friction
- operator friction
- portability across harnesses

### Decision after the trial

#### Kill the public CLI if:
- almost all work happened through harness + skills + scripts
- the CLI added little besides convenience
- CI can call scripts directly
- new users are better served by harness-first examples

#### Keep only a thin CLI if:
- it materially improves CI/manual smoke
- it remains the best compatibility bridge
- it adds convenience without reclaiming the center

---

## Phase 6 — Rewrite the product story

### New story

Old story:

> “CLI-first automated short-form video generator.”

New story:

> “Harness-ready short-form content runtime, contracts, evaluators, and reference-analysis toolkit.”

### Docs changes

- README rewrite
- “legacy wrapper” section for any surviving CLI
- skills-first usage examples
- runtime/package examples
- harness examples for Claude / Codex / OpenCode

---

## 13. Testing strategy

This pivot only works if tested at four levels.

## 13.1 Contract tests

Purpose: make artifact compatibility reliable.

Test:

- valid fixture acceptance
- invalid fixture rejection
- roundtrip serialization
- schema version checks
- compatibility of downstream stages

## 13.2 Runtime tests

Purpose: ensure deterministic execution still works.

Test:

- render smoke
- template rendering
- validation
- scoring
- videospec on sample media
- file-output expectations
- performance sanity on representative fixtures

## 13.3 Skill tests

Purpose: ensure the new intelligence surface is real, not just aspirational.

Test:

- correct triggering
- correct non-triggering
- procedure adherence
- correct calls to scripts/runtime
- correct artifact outputs

## 13.4 Content tests

Purpose: ensure the system helps make better content, not just better code.

Pre-publication gates:

- script score threshold
- output validation
- packaging review
- reference alignment checks when relevant

Post-publication loop:

- platform metrics
- comments / search insights
- retention / engaged views / watch time
- postmortem notes
- next-variant recommendations

---

## 14. The content-production loop during migration

Do not stop publishing during the refactor.

### Weekly minimum

- 2 published shorts
- 1 additional test draft
- 1 reverse-engineered winning reference
- 1 postmortem
- 1 improvement to either a skill or repo guidance

### Weekly cadence

#### Monday
- collect topic opportunities
- inspect recent performance
- select 2–3 candidate topics

#### Tuesday
- run topic-selection skill
- produce briefs
- draft scripts
- produce packaging variants

#### Wednesday
- create/publish variant A

#### Thursday
- create/publish variant B
- or remake a reference with a changed angle

#### Friday
- review metrics
- run postmortem
- update skill/AGENTS guidance based on real failure

### Rule

The code migration is allowed to improve the publishing loop.  
It is not allowed to replace the publishing loop.

---

## 15. The platform-data loop that should replace generic “research”

Generic web research is no longer enough as the center of topic selection.

The better loop is:

1. platform-native topic opportunity
2. skill-driven brief/script/package generation
3. runtime execution
4. publication
5. performance report
6. postmortem
7. improved next variant

### Inputs that matter

#### TikTok
- Creator Search Insights
- TikTok Studio analytics
- comment insights
- viewer/activity information where available

#### YouTube Shorts
- watch time
- average view duration
- engaged views
- audience retention / key moments where available
- compare top vs bottom performers

### New artifact to add

Add `performance-report.v1.json`.

Suggested fields:

- platform
- post_url
- post_id
- publish_time
- topic
- hook
- format/archetype
- script artifact ref
- packaging artifact ref
- views
- engaged_views
- average_view_duration
- retention notes
- likes
- comments
- shares
- saves
- search performance notes
- manual observations
- recommended next move

This artifact closes the loop.

Without it, Content Machine remains a generator, not a learning system.

---

## 16. Recommended immediate next actions

Do these in order.

1. Freeze orchestration-heavy feature work.
2. Publish the internal architecture decision.
3. Create `packages/contracts`.
4. Create `packages/runtime`.
5. Add `performance-report.v1.json`.
6. Move scoring, validation, and videospec into runtime first.
7. Add script entrypoints for deterministic execution.
8. Build the first 3 skills:
   - topic selection
   - script from brief
   - remake from reference
9. Run a zero-public-CLI trial.
10. Rewrite the README only after the trial data comes back.

---

## 17. Decision matrix

### If the main goal is “ship content fast now”
Use:
- current runtime
- minimal migration
- a thin CLI if it helps
- first 2–3 skills only

### If the main goal is “build the right long-term boundary”
Prioritize:
- contracts
- runtime extraction
- scripts
- skills
- de-centering the CLI

### If the main goal is “maximize cross-harness portability”
Prioritize:
- skill format compatibility
- AGENTS/CLAUDE guidance
- package APIs
- script entrypoints
- avoiding hidden orchestration logic

### If the main goal is “build a durable moat”
Prioritize:
- evaluators
- videospec
- template/runtime quality
- closed-loop post-publication learning
- proprietary or hard-won playbooks encoded as skills

---

## 18. Explicit things to avoid

Do not do these next:

- do not build a new monolithic agent wrapper
- do not over-invest in a broad public CLI before the trial
- do not treat MCP as the center of the architecture
- do not keep provider-specific inference tightly mixed into core runtime forever
- do not let research/promptcraft continue to dominate the product story
- do not pause publishing to do architecture cleanup

---

## 19. Final recommendation

The future of Content Machine is not as a standalone content bot.

Its future is as a **portable content operating substrate** for agentic coding harnesses.

That means:

- **skills-first** for intelligence
- **runtime/packages-first** for execution
- **scripts/hooks-first** for deterministic control
- **optional thin CLI** for compatibility/dev/CI only
- **optional MCP** for external/shared integrations only

The repo should be judged by this question:

> If Claude Code, Codex, or OpenCode orchestrates the work, what remains uniquely valuable here?

The answer should become:

- contracts
- runtime
- evaluators
- reverse-engineering
- templates
- repeatable content playbooks
- learning loops from published results

If that becomes true, Content Machine survives and becomes stronger.

If not, it collapses into a wrapper around capabilities that now live better in the harness layer.

---

## 20. Source notes

This report was written from two evidence layers:

### A. Your own doctrine / operating model
The direction in this report is strongly aligned with your uploaded frontier-agent playbook:
- LLMs should own reasoning/planning/orchestration by default
- deterministic systems should own validation, rollback, tests, and hard constraints
- avoid legacy automation fallback
- ask what loop should pursue the work
- treat repo guidance and skills as durable behavioral infrastructure

### B. Current ecosystem docs
The current docs support these ecosystem conclusions:

- Claude Code is available across terminal, IDE, desktop, and browser.
- Claude Code treats skills as reusable `SKILL.md`-based capabilities and hooks as deterministic shell automation.
- Codex treats customization as a layered system of `AGENTS.md`, skills, MCP, and subagents.
- Codex skills are reusable workflow packages with instructions, resources, and optional scripts.
- OpenCode discovers skills from `.opencode/skills`, `.claude/skills`, and `.agents/skills`.
- MCP remains supported across these ecosystems, but as a tool/context bridge rather than evidence that it should be the product center.
- Content Machine’s current repo still publicly presents a CLI-first one-command story, while the repo already contains broader runtime/evaluation/research surfaces.

A source appendix with URLs is included below.

---

## 21. Source appendix (URLs)

### Official harness / platform docs
- Claude Code overview: https://code.claude.com/docs/en/overview
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code hooks: https://code.claude.com/docs/en/hooks-guide
- Claude Code features overview: https://code.claude.com/docs/en/features-overview
- Claude Code settings: https://code.claude.com/docs/en/settings
- Codex customization: https://developers.openai.com/codex/concepts/customization
- Codex skills: https://developers.openai.com/codex/skills
- Codex best practices: https://developers.openai.com/codex/learn/best-practices
- Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Codex MCP: https://developers.openai.com/codex/mcp
- Codex CLI: https://developers.openai.com/codex/cli
- Codex changelog: https://developers.openai.com/codex/changelog
- OpenAI skills in API: https://developers.openai.com/cookbook/examples/skills_in_api
- OpenCode skills: https://opencode.ai/docs/skills/
- OpenCode agents: https://opencode.ai/docs/agents/
- OpenCode MCP servers: https://opencode.ai/docs/mcp-servers/
- OpenCode config: https://opencode.ai/docs/config/

### Official creator/platform analytics docs
- TikTok Creator Search Insights: https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights
- TikTok Studio: https://support.tiktok.com/en/using-tiktok/creating-videos/tiktok-studio
- TikTok comment insights: https://support.tiktok.com/en/using-tiktok/growing-your-audience/comment-insights-on-tiktok
- YouTube Analytics (engagement / Shorts): https://support.google.com/youtube/answer/9002587?hl=en
- YouTube audience retention / key moments: https://support.google.com/youtube/answer/9314415?hl=en
- YouTube analytics comparisons: https://support.google.com/youtube/answer/16766491?hl=en

### Current Content Machine repo references
- Repo landing page / README rendering: https://github.com/45ck/content-machine
- MCP reference doc: https://github.com/45ck/content-machine/blob/master/docs/reference/cm-mcp-reference-20260126.md
- VideoSpec reference doc: https://github.com/45ck/content-machine/blob/master/docs/reference/cm-videospec-reference-20260210.md
- Score reference doc: https://github.com/45ck/content-machine/blob/master/docs/reference/cm-score-reference-20260107.md
- Artifact contracts: https://github.com/45ck/content-machine/blob/master/docs/reference/ARTIFACT-CONTRACTS.md
- package.json: https://github.com/45ck/content-machine/blob/master/package.json

---

## 22. One-sentence final decision

**Keep Content Machine, but strip it of its monolithic agent identity and rebuild it as a skill-driven, harness-native content runtime with optional thin CLI compatibility and optional MCP adapters.**
