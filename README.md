# Content Machine

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/banner.light.png" />
    <img src="assets/banner.light.png" alt="content-machine banner" width="100%" />
  </picture>
</p>

**Content Machine is a local-first short-form video toolkit for coding
agents.**

It helps Claude Code, Codex CLI, and similar agents create TikTok videos,
Instagram Reels, and YouTube Shorts by calling repo-local skills,
flows, and deterministic media scripts.

The goal is simple: turn a topic or source video into a high-quality
vertical short with inspectable artifacts at every step.

## 30-Second Version

- **What it is:** a skill pack plus deterministic runtime for making
  short-form videos from coding-agent CLIs.
- **How it works:** agents read `skills/`, pick or run `flows/`, then
  call JSON-stdio scripts only when execution is needed.
- **Why it matters:** every stage writes files you can inspect: script,
  audio, timestamps, visuals, captions, render metadata, and review.

Content Machine is moving away from a monolithic "AI video agent" and
toward repo-local skills and `45ck/prompt-language` flows for building
short-form video well. Runtime scripts still exist, but they are support
surfaces behind the skill pack rather than the product story.

```text
source or topic
  -> script / highlight selection
  -> audio + timestamps
  -> visuals
  -> captions + render
  -> quality-gated MP4
```

## Featured Example

The main tracked showcase in this repo is the Reddit post over gameplay
short. This is the default Reddit story mode: full-screen gameplay, a
Reddit post card opener, then captions over gameplay with no random
support clips.

Current showcase shape:

- full-screen Subway Surfers-style gameplay from frame one
- Reddit screenshot-style opener for the first `3s` to `5s`
- captions continue directly over gameplay after the opener
- no stock B-roll, no generated story clips, no split-screen top lane

Named bread-and-butter story archetypes:

- `reddit-post-over-gameplay`: Reddit card over full-screen gameplay,
  then captions continue over gameplay.
- `reddit-story-split-screen`: Reddit card opener, then top story
  footage plus bottom gameplay.
- `gameplay-confession-split`: non-Reddit storytime with top support
  footage plus bottom gameplay.

Useful next links:

- [Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md)
- [Agent Quickstart](docs/user/AGENT-QUICKSTART.md)
- [Archetype Guide](docs/user/ARCHETYPES.md)
- [Showcase Gallery](docs/user/showcase/README.md)
- [Creative Sources](docs/user/CREATIVE-SOURCES.md)
- [Reddit Post Over Gameplay](docs/user/examples/reddit-post-over-gameplay.md)
- [Reddit Story Split-Screen](docs/user/examples/reddit-story-split-screen.md)
  (workflow lane; public demo is being rebuilt after gutter detection)
- [reddit-story-short skill](skills/reddit-story-short/SKILL.md)
- [reddit-post-over-gameplay-short skill](skills/reddit-post-over-gameplay-short/SKILL.md)
- [reddit-card-overlay skill](skills/reddit-card-overlay/SKILL.md)

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-9-reddit-post-over-gameplay.gif" alt="Reddit post over gameplay showcase" width="280" />
  </a>
</p>

The README embeds only the flagship preview, but the fastest orientation
path is three clips:

| Need                                      | Watch                                                                                                                        | Inspect                                                                                      | Reproduce                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Story/default gameplay format             | [`demo-9`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4)               | [`provenance`](docs/demo/provenance/README.md#demo-9-reddit-post-over-gameplay)              | [`example`](docs/user/examples/reddit-post-over-gameplay.md) |
| Low-attention OSS repo explainer          | [`demo-18`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4) | [`provenance`](docs/demo/provenance/README.md#demo-18-content-machine-reddit-gameplay-remix) | [`example`](docs/user/examples/content-machine-self-demo.md) |
| Cleaner educational motion-card explainer | [`demo-19`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4)          | [`provenance`](docs/demo/provenance/README.md#demo-19-content-machine-motion-cards)          | [`example`](docs/user/examples/content-machine-self-demo.md) |

Open the [Showcase Gallery](docs/user/showcase/README.md) for every lane
and the [Demo Gallery](docs/demo/README.md) for the generated demo
manifest, preview status, source docs, and review caveats.

Full gallery status guide:

- `golden showcase`: a promoted example with passing review gates
- `showcase candidate`: real MP4 exists, but review or polish gaps remain
- `supporting showcase candidate`: useful for onboarding or a secondary workflow
- `proving candidate`: real MP4 exists, but it is not a default yet
- `experimental preview`: directionally useful, below the public promotion bar
- `workflow`: runnable technique walkthrough with explicit prerequisites

## Current Focus

Content Machine is not trying to be a giant all-in-one video app. The
active direction is a small, reliable local runtime that agents can use
well:

- pick strong short-form moments from long videos
- approve highlights before expensive render work
- generate scripts, audio, visuals, captions, and MP4s as separate files
- compose lanes with optional visual treatments such as 3D/procedural
  gameplay backgrounds
- keep every step inspectable and repeatable
- use skills and flows as the main interface, with `cm` kept thin

Read the current build plan:
[Short-Form Roadmap](docs/direction/07-short-form-roadmap-20260424.md).

Archetype rollout plan:
[Archetype Rollout](docs/direction/08-archetype-rollout-20260427.md).

User-facing archetype guide:
[Archetypes](docs/user/ARCHETYPES.md).

Fast visual map of what the repo can make:
[Showcase Gallery](docs/user/showcase/README.md).

Preview asset index:
[Demo Gallery](docs/demo/README.md).

Review and promotion rules:
[Quality And Review](docs/user/QUALITY-AND-REVIEW.md).

Graphics-heavy demos can also ship `docs/demo/*.layout.json` sidecars.
The demo audit uses `45ck/video-evaluator` as the shared analyzer for
declared element overlap, caption safe-zone collisions, and reusable video
evidence. Content Machine keeps skills, archetype workflows, Remotion choices,
caption style guidance, and publish policy local; the evaluator owns generic
analysis that can be reused by other repos.

Tracked preview assets live in
[`docs/demo/`](docs/demo/README.md). The root README features the
default Reddit/gameplay example as the first golden showcase. Supporting
and experimental clips stay in the gallery until review evidence says
they should move up.

> Early development. Skills and flows are now the primary interface;
> runtime scripts are support surfaces behind those docs. The legacy
> CLI control plane has been moved into
> [`archive/legacy-cli/`](archive/legacy-cli/README.md); the remaining
> `cm` shell is intentionally thin.

> The primary user path is
> [Agent Quickstart](docs/user/AGENT-QUICKSTART.md), with
> [Archetypes](docs/user/ARCHETYPES.md),
> [Showcase Gallery](docs/user/showcase/README.md),
> [skills/](skills/README.md), [flows/](flows/README.md), and
> [scripts/harness/](scripts/harness/README.md) as deeper surfaces.

## Start Here

### Install Into An Existing Agent Project

Use this when you want Claude Code, Codex CLI, Cursor, or another
repo-aware coding agent to use Content Machine inside your own project:

```bash
npm install --save-dev @45ck/content-machine

npx cm-install --target .content-machine --write-instructions
npx --no-install cm-agent list
```

The `--write-instructions` flag adds a managed root block that points
agents at `.content-machine/`. See
[Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md) for Claude
Code and other harness-specific variants.

Installed-pack commands use `npx --no-install cm-agent <tool>`. The
repo-local `node --import tsx scripts/harness/*.ts` commands below are
for contributors working inside this checkout.

### Work From This Repo

```bash
npm install
```

Node.js 20.6+ is required.

First run order:

1. Run `doctor-report` to check the environment.
2. Use the no-key smoke path in
   [`content-machine-self-demo`](docs/user/examples/content-machine-self-demo.md#no-key-smoke-test)
   if you only want to prove the artifact chain.
3. Run `generate-short` or
   [`showcase-content-machine`](flows/showcase-content-machine.md) when
   API keys and provider credentials are ready.

### Primary Path: Coding-Agent CLIs

Content Machine assumes you already work inside Claude Code, Codex CLI,
Cursor, or a similar agent harness. The human UX is to ask that harness
for the outcome; the repo gives the harness skills, flows, and
JSON-stdio tools it can read or execute.

Use these surfaces in this order:

- [`skills/`](skills/README.md): decide what job the agent is doing
- [`flows/`](flows/README.md): coordinate multi-step work
- [`scripts/harness/`](scripts/harness/README.md): execute a repo-side
  JSON-stdio step when a skill or flow needs runtime support

If you are deciding where to start:

- Start with [Archetypes](docs/user/ARCHETYPES.md) when choosing what
  kind of short to make.
- Start with a skill when you want one capability.
- Start with a flow when you want a full multi-step path.
- Start with `scripts/harness/` only when you need the exact repo-side
  executable.
- For longform source videos, start with
  [`longform-to-shorts`](flows/longform-to-shorts.md) to select and
  approve clips, then use `longform-clip-extract` before render work.
- Use [Quality And Review](docs/user/QUALITY-AND-REVIEW.md) before
  promoting a render as a showcase.

Discover what is shipped:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON

cat <<'JSON' | node --import tsx scripts/harness/flow-catalog.ts
{}
JSON
```

Current repo-side entrypoints are listed in
[`scripts/harness/`](scripts/harness/README.md).

If you want these skills inside another project, use
[Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md) to
materialize a local `.content-machine/` pack and root instruction block.

Use [`skills/`](skills/README.md) or the `skill-catalog` harness script
for the current shipped skill list.

### Thin `cm` Shell

```bash
npm run cm -- --help
```

Only `config`, `doctor`, `mcp`, and `render` remain live under `cm`.
Everything else now lives in [`archive/legacy-cli/`](archive/legacy-cli/README.md).

See [full installation guide](docs/user/INSTALLATION.md) for optional
setup such as Whisper and `ffmpeg`.

## Read Deeper

Use these when you need more context:

- [Reddit Story Split-Screen](docs/user/examples/reddit-story-split-screen.md) -
  hybrid Reddit/gameplay lane
- [Archetypes](docs/user/ARCHETYPES.md) - lane selection, maturity
  status, and backlog
- [Quality And Review](docs/user/QUALITY-AND-REVIEW.md) - review gates
  before a render is considered ready
- [Creative Sources](docs/user/CREATIVE-SOURCES.md) - external source
  scouting for animation, 3D, stock, audio, and AI generation
- [Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md) - install
  Content Machine into Codex CLI, Claude Code, Cursor, or another
  repo-aware agent project
- [Agent Quickstart](docs/user/AGENT-QUICKSTART.md) - quickest user path
- [Skills](skills/README.md) - all agent-facing capabilities
- [Flows](flows/README.md) - orchestration patterns
- [Harness Scripts](scripts/harness/README.md) - executable runtime entrypoints
- [Short-Form Roadmap](docs/direction/07-short-form-roadmap-20260424.md) -
  what we are building next and why
- [Archetype Rollout](docs/direction/08-archetype-rollout-20260427.md) -
  which short-form lanes exist, which are proven, and what gets built next
- [Direction](DIRECTION.md) - product boundaries and migration decisions
- [User Guide](docs/user/README.md) - broader usage docs
- [Developer Docs](docs/dev/README.md) - architecture, registries, and internals
- [Research](docs/research/00-SUMMARY-20260102.md) - reference repo findings and experiments
- [Reference](docs/reference/) - generated glossary, facts, and CLI reference
- [Archive](archive/README.md) - frozen legacy code and notes

The primary user guide is now
[docs/user/AGENT-QUICKSTART.md](docs/user/AGENT-QUICKSTART.md). The
archived CLI notes live under
[archive/legacy-cli/](archive/legacy-cli/README.md).

## Visitor Map

| Path                | Role                                                         |
| ------------------- | ------------------------------------------------------------ |
| `skills/`           | Agent-readable capability docs and examples                  |
| `flows/`            | Executable prompt-language workflow manifests                |
| `scripts/harness/`  | JSON-stdio runtime entrypoints for repo checkouts            |
| `agent/`            | Installed-package runner and `cm-install` bin                |
| `docs/user/`        | Human-facing install, quickstart, gallery, and examples      |
| `docs/demo/`        | Generated demo manifest, provenance, previews, and caveats   |
| `src/harness/`      | Reusable logic behind JSON-stdio entrypoints                 |
| `src/`              | TypeScript media, render, scoring, validation, and providers |
| `assets/`           | Archetypes, fonts, templates, and lightweight README assets  |
| `fixtures/`         | Small runnable examples and test fixtures                    |
| `experiments/`      | Tracked proving reports; generated outputs stay ignored      |
| `evals/` / `bench/` | Promptfoo configs, scoring evals, and benchmark material     |
| `registry/`         | Source YAML for generated glossary and repo facts            |
| `archive/`          | Frozen legacy surfaces and old demos                         |

Run-scoped flows write under `runs/<run-id>/` by default. Direct skills
can also write to explicit output paths.

## What You Can Do

- Generate a short-form video from a topic.
- Reverse-engineer a winning reference short from a local file or URL.
- Generate only scripts, audio, visuals, or renders when needed.
- Run structured diagnostics before expensive generation work.
- Use the thin `cm` shell only for config, diagnostics, MCP, or render compatibility.

![Pipeline overview](assets/demo/pipeline-preview.svg)

## Documentation

- **[Agent Quickstart](docs/user/AGENT-QUICKSTART.md)** — primary user path for Claude Code, Codex CLI, and similar tools
- **[Archetypes](docs/user/ARCHETYPES.md)** — choose the right short-form lane and see what is proven
- **[Quality And Review](docs/user/QUALITY-AND-REVIEW.md)** — review gates for captions, audio, motion, safe zones, and promotion
- **[Creative Sources](docs/user/CREATIVE-SOURCES.md)** — source scouting rules and the `1000`-site candidate catalog
- **[skills/](skills/README.md)** — agent-facing skill docs
- **[flows/](flows/README.md)** — `45ck/prompt-language` docs and executable flows
- **[scripts/harness/](scripts/harness/README.md)** — optional repo-side runners and execution model
- **[Direction](DIRECTION.md)** — migration plan, cut lines, and archive policy
- **[User Guide](docs/user/README.md)** — skill-pack docs
- **[Developer Docs](docs/dev/README.md)** — active architecture, registries, and legacy engineering docs
- **[Reference](docs/reference/)** — generated references, environment variables, glossary, and CLI details
- **[Archive](archive/README.md)** — frozen legacy control-plane code and notes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine
npm install
npm run quality
```

## License

MIT
