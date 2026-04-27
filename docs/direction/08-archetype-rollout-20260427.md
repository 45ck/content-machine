# Archetype Rollout 20260427

This document turns the current short-form repo scan into a product
rollout plan.

Reddit split-screen stays the tracked showcase lane because it is the
only one already proven with a strong example surface. Generic Reddit
story requests should still default to `reddit-post-over-gameplay`.
Everything else should be treated as one of these status labels:

- `showcase` — proven lane with docs, skill, and example users can
  inspect as a reference
- `default` — the mode agents should choose for generic requests in
  that family
- `skill-backed` — lane has a dedicated skill, but still needs a
  stronger proving example or runtime hardening
- `partial` — broad capability exists, but the lane is still generic,
  archetype-only, or missing lane-specific runtime/example surface
- `missing` — no dedicated skill yet

## How We Make All Of These Into Skills

Do not build one pipeline per archetype. Build them in layers:

1. `family`
   story, faceless information, commercial, clipper, designed
2. `lane skill`
   one `SKILL.md` per lane with selection hints, lane grammar, and
   validation rules
3. `shared runtime`
   reuse the same scripts/harness primitives across many lanes
4. `proving example`
   every lane needs one concrete example video and one example request
5. `blackbox eval`
   run Codex/Claude in a fresh folder with the installed pack and prove
   the lane can finish

That means “make them all at once” should be interpreted as:

- define the whole lane catalog now
- keep the skill layer ahead of the runtime layer
- prove lanes in waves instead of pretending all 30 are equally mature

## Shared Runtime Trunks

Most lanes cluster under a small number of runtime trunks:

- `story split-screen`
  opener card, top-lane support visuals, bottom-lane gameplay, midpoint
  captions
- `stock-first faceless`
  hook-first script, per-scene visual intent, stock/local/generated
  support clips, captions, music
- `card/diagram designed`
  motion cards, reveal states, diagram beats, deterministic timing
- `clipper`
  source-media analysis, ASR/timestamps, candidate ranking,
  boundary-snap, approval, reframe, source clip extraction
- `commercial proof`
  problem, solution, proof/demo, CTA with optional avatar, product
  visuals, and screen recording
- `generated-scene continuity`
  per-shot prompt planning, continuity references, chained scene
  generation

## Lane ID vs Script Archetype

Use `laneId` for visual/editing lanes such as
`reddit-post-over-gameplay`, `stock-b-roll-explainer`, and
`gameplay-confession-split`.

Use `scriptArchetype` for script shapes such as `story`, `listicle`,
`howto`, `versus`, and `product-demo`.

Do not pass a lane ID into a script-archetype field unless a runtime
surface explicitly says it accepts `laneId`.

## Showcase

| Lane                         | Status     | Why it stays visible                                                     | First proving example                                                              |
| ---------------------------- | ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `reddit-story-split-screen`  | `showcase` | Current tracked showcase/hybrid lane.                                    | `AITA for cancelling my sister's free wedding photos two days before the wedding?` |
| `gameplay-confession-split`  | `example`  | Current native-feel proving example for non-Reddit gameplay story split. | `My roommate lied about a six-figure remote job.`                                  |
| `reddit-post-over-gameplay`  | `default`  | Default generic Reddit story mode, still needs first-class proving MP4.  | `AITA for exposing my roommate's fake job offer to our landlord?`                  |

## Family: Story Lanes

| Lane                        | Status         | Skill now                                                                                                                            | Main gap                                                                     | First proving example                                                                        |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `reddit-post-over-gameplay` | `skill-backed` | [`reddit-post-over-gameplay-short`](../../skills/reddit-post-over-gameplay-short/SKILL.md), [`reddit-card-overlay`](../../skills/reddit-card-overlay/SKILL.md) | Needs first-class full-gameplay proving render.                               | `AITA for exposing my roommate's fake job offer to our landlord?`                            |
| `reddit-story-split-screen` | `showcase`     | [`reddit-story-short`](../../skills/reddit-story-short/SKILL.md), [`reddit-card-overlay`](../../skills/reddit-card-overlay/SKILL.md) | Packaged empty-project render path still needs hardening.                    | `AITA for cancelling my sister's free wedding photos two days before the wedding?`           |
| `gameplay-confession-split` | `skill-backed` | [`gameplay-confession-short`](../../skills/gameplay-confession-short/SKILL.md)                                                       | Needs cleaner canonical example and better caption/cadence pass.             | `My roommate moved her boyfriend in and still expected me to cover half the rent.`           |
| `text-thread-reveal`        | `skill-backed` | [`text-message-drama-short`](../../skills/text-message-drama-short/SKILL.md)                                                         | Needs first-class message-card runtime and stronger blackbox render path.    | `The breakup texts looked normal until the wrong-number message exposed everything.`         |
| `receipt-stack-drama`       | `partial`      | adjacent story skills only                                                                                                           | Needs reusable receipt/phone asset generator and lane-specific scene schema. | `She said I was lying, then I opened the Venmo history, calendar invite, and hotel receipt.` |
| `comment-chain-escalation`  | `partial`      | Reddit pieces exist                                                                                                                  | Needs `post -> comment -> OP update -> verdict` pacing surface.              | `The top comment made OP admit the one detail that changed the whole story.`                 |
| `phone-ui-storytime`        | `missing`      | none                                                                                                                                 | Needs phone UI builder, notification/call/voicemail cards, and example.      | `Seventeen missed calls and one voicemail after I exposed the group chat.`                   |
| `social-card-cold-open`     | `partial`      | [`hook-overlay`](../../skills/hook-overlay/SKILL.md), Reddit card support                                                            | Needs non-Reddit social-card assets reusable across lanes.                   | `I charged my family for Thanksgiving leftovers.`                                            |

## Family: Faceless Information Lanes

| Lane                         | Status         | Skill now                                                                                                                                            | Main gap                                                            | First proving example                                                      |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `stock-b-roll-explainer`     | `skill-backed` | [`stock-footage-edutainment-short`](../../skills/stock-footage-edutainment-short/SKILL.md)                                                           | Needs first-class example request and stronger proving render.      | `Why airlines overbook flights.`                                           |
| `fast-facts-countdown`       | `skill-backed` | [`facts-listicle-short`](../../skills/facts-listicle-short/SKILL.md)                                                                                 | Needs research-backed proving package beyond generic docs.          | `5 weird facts about sleep debt.`                                          |
| `news-what-it-means`         | `missing`      | only adjacent explainer surfaces                                                                                                                     | Needs freshness/citation contract and explicit news review rules.   | `Why the Francis Scott Key Bridge collapse disrupted East Coast shipping.` |
| `micro-doc-breakdown`        | `partial`      | [`animation-explainer-short`](../../skills/animation-explainer-short/SKILL.md), [`faceless-mixed-short`](../../skills/faceless-mixed-short/SKILL.md) | Needs archival/timeline/map/quote-card lane grammar.                | `How Blockbuster actually died.`                                           |
| `myth-vs-fact-debunk`        | `partial`      | archetype exists, no lane skill                                                                                                                      | Needs lane wrapper for proof, cards, diagrams, and nuance.          | `Myth: you need 10,000 steps a day.`                                       |
| `tool-workflow-explainer`    | `partial`      | adjacent explainer/commercial skills                                                                                                                 | Needs screenflow-first archetype and callout grammar.               | `How content-machine turns a 1-hour podcast into an approved short.`       |
| `finance-business-breakdown` | `partial`      | adjacent explainer surfaces                                                                                                                          | Needs chart/card rules and financial-claims discipline.             | `How stock buybacks make earnings look bigger.`                            |
| `history-mini-story`         | `partial`      | generic story/explainer surfaces                                                                                                                     | Needs date-card and archival still motion grammar.                  | `How the Berlin Wall fell faster than anyone expected.`                    |
| `controversy-recap`          | `missing`      | no direct skill                                                                                                                                      | Needs chronology-first contract and stronger factual-risk controls. | `Why Fyre Festival collapsed.`                                             |

## Family: Commercial And Creator-Adjacent Lanes

| Lane                          | Status         | Skill now                                                                          | Main gap                                                                   | First proving example                                                              |
| ----------------------------- | -------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `saas-problem-solution`       | `skill-backed` | [`saas-problem-solution-short`](../../skills/saas-problem-solution-short/SKILL.md) | Needs request example, proving run, and better BYO product-visuals recipe. | `Stop turning sales calls into CRM notes by hand.`                                 |
| `ugc-avatar`                  | `skill-backed` | [`ugc-avatar-short`](../../skills/ugc-avatar-short/SKILL.md)                       | Needs concrete avatar runtime contract and proving example.                | `I used this AI scheduling assistant for 7 days.`                                  |
| `app-review`                  | `missing`      | archetype-adjacent only                                                            | Needs review/disclosure workflow on top of demo lane.                      | `Notion Calendar in 35 seconds: who should use it, who shouldn't.`                 |
| `product-demo`                | `partial`      | archetype exists, no lane skill                                                    | Needs first-class screen recording/demo runtime.                           | `Turn a 40-minute podcast into 3 shorts with content-machine.`                     |
| `before-after-transformation` | `partial`      | archetype exists, no lane skill                                                    | Needs paired before/after asset handling and contrast checks.              | `AI note-taking app landing page before and after.`                                |
| `creator-ad`                  | `missing`      | composable from current pieces                                                     | Needs one parent commercial lane choosing avatar/faceless/demo mode.       | `This Notion content planner saves me 45 minutes every upload day.`                |
| `affiliate-style-pitch`       | `missing`      | none                                                                               | Needs disclosure overlay, alternatives, and soft CTA rules.                | `I earn from this link, but here's when I would and wouldn't recommend Riverside.` |

## Family: Clipper And Repurposing Lanes

| Lane                                | Status    | Skill now                                                                                  | Main gap                                                                     | First proving example                                                |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `podcast-insight-clip`              | `partial` | [`longform-to-shorts`](../../skills/longform-to-shorts/SKILL.md) plus highlight primitives | Needs dedicated source clip extraction + reframe runner and podcast example. | `The real reason startups die is not lack of ideas.`                 |
| `interview-answer-clip`             | `partial` | same broad stack                                                                           | Needs question/answer aware selection and two-speaker reframing.             | `What was the first real sign of product-market fit?`                |
| `webinar-screen-demo-clip`          | `partial` | broad clipper and screen reframe skills                                                    | Needs executable cursor-led crop runtime and mixed webcam/screen handling.   | `Watch this dashboard auto-triage 400 support tickets.`              |
| `gameplay-reaction-highlight`       | `missing` | none                                                                                       | Needs gameplay event scoring from comms/HUD/OCR, not just transcript logic.  | `Valorant 1v4 clutch with live comms intact.`                        |
| `sports-play-highlight`             | `missing` | none                                                                                       | Needs replay dedupe, scoreboard OCR, and event detection.                    | `Soccer goal: buildup, strike, reaction, one replay.`                |
| `news-pullquote-highlight`          | `missing` | no direct clipping lane                                                                    | Needs baked-text-aware clipping and lower-third collision handling.          | `What changed overnight in the ruling.`                              |
| `longform-raw-excerpt-short`        | `partial` | broad clipper stack                                                                        | Needs original-audio preservation flow and one end-to-end example.           | `Straight 35s podcast excerpt with captions and portrait reframe.`   |
| `longform-remixed-hook-first-short` | `partial` | broad clipper stack                                                                        | Needs cold-open then jump-back logic and editorial honesty checks.           | `Open on the punchline, then jump back 8 seconds to the setup.`      |
| `longform-multi-clip-pack`          | `missing` | no single skill                                                                            | Needs batch selection, overlap control, and per-clip review bundles.         | `One 60-minute interview yields 5 distinct approved vertical clips.` |

## Family: Designed And Generated Lanes

| Lane                                  | Status         | Skill now                                                                                                                                                | Main gap                                                                        | First proving example                                               |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `motion-card-lesson`                  | `skill-backed` | [`motion-card-lesson-short`](../../skills/motion-card-lesson-short/SKILL.md)                                                                             | Needs lane-specific card-state runtime and proving render.                      | `What cache invalidation actually means.`                           |
| `animation-explainer`                 | `skill-backed` | [`animation-explainer-short`](../../skills/animation-explainer-short/SKILL.md)                                                                           | Needs example request and beat-mode planner.                                    | `How rate limits protect APIs.`                                     |
| `ai-image-cinematic-story`            | `missing`      | continuity and mixed-shot pieces only                                                                                                                    | Needs story-world schema, continuity notes, and review rubric.                  | `The last librarian who remembers the internet.`                    |
| `quiz-countdown-reveal`               | `partial`      | variant inside motion-card lane                                                                                                                          | Needs countdown/reveal event schema and proof render.                           | `Guess the tech term from one clue in 3 seconds.`                   |
| `multilingual-card-lesson`            | `missing`      | no dedicated lane                                                                                                                                        | Needs locale fields, multilingual caption/font defaults, and bilingual example. | `Cache, queue, and schema explained in English and Spanish.`        |
| `continuity-chained-generated-scenes` | `skill-backed` | [`continuity-chain`](../../skills/continuity-chain/SKILL.md), [`storyboard-continuity-reference`](../../skills/storyboard-continuity-reference/SKILL.md) | Needs harness entrypoint, example request, and `visuals.json` lineage.          | `Courier carrying one glowing package through a flooded neon city.` |

## Proving Waves

### Wave 0: Keep The Flagship Stable

1. `reddit-story-split-screen`

### Wave 1: Reuse The Existing Runtime Most Aggressively

1. `reddit-post-over-gameplay`
2. `stock-b-roll-explainer`
3. `text-thread-reveal`
4. `fast-facts-countdown`
5. `saas-problem-solution`
6. `motion-card-lesson`

### Wave 2: Fill The Biggest Product Gaps Without New Engines

1. `micro-doc-breakdown`
2. `myth-vs-fact-debunk`
3. `tool-workflow-explainer`
4. `product-demo`
5. `app-review`
6. `animation-explainer`

### Wave 3: Make The Clipper Family Real

1. `podcast-insight-clip`
2. `interview-answer-clip`
3. `webinar-screen-demo-clip`
4. `longform-raw-excerpt-short`
5. `longform-multi-clip-pack`

### Wave 4: New Runtime Territory

1. `receipt-stack-drama`
2. `phone-ui-storytime`
3. `news-what-it-means`
4. `finance-business-breakdown`
5. `history-mini-story`
6. `ai-image-cinematic-story`
7. `continuity-chained-generated-scenes`

### Wave 5: Highest-Risk Or Highest-Policy Lanes

1. `controversy-recap`
2. `affiliate-style-pitch`
3. `sports-play-highlight`
4. `gameplay-reaction-highlight`
5. `news-pullquote-highlight`

## Immediate Build Order

If the goal is to grow the catalog fast without destabilizing the repo,
the next ten proving runs should be:

1. `stock-b-roll-explainer`
2. `reddit-post-over-gameplay`
3. `text-thread-reveal`
4. `saas-problem-solution`
5. `fast-facts-countdown`
6. `motion-card-lesson`
7. `animation-explainer`
8. `ugc-avatar`
9. `micro-doc-breakdown`
10. `product-demo`

## Runtime Gaps That Block Many Lanes At Once

- packaged empty-project render stability
- message/receipt/phone UI asset generator
- lane-specific example requests for newer skills
- screen recording and cursor-led demo clipping
- source clip extraction + portrait reframe runner
- generated-scene lineage in `visuals.json`
- per-lane review bundles and blackbox eval scaffolds

## Keep Showcase vs Default Separate

The README and user docs can keep `reddit-story-split-screen` as a
tracked showcase while still treating `reddit-post-over-gameplay` as the
default generic Reddit request. Do not collapse those two modes.

- story
- faceless information
- commercial
- clipper
- designed/generated
