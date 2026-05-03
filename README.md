# Content Machine

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/banner.light.png" />
    <img src="assets/banner.light.png" alt="content-machine banner" width="100%" />
  </picture>
</p>

**Content Machine is a local-first short-form video skill pack for
coding agents.**

It gives Claude Code, Codex CLI, Cursor, and similar agents the skills,
flows, and deterministic runtime tools they need to make TikTok videos,
Instagram Reels, and YouTube Shorts without hiding the process.

The point is simple: ask your agent for a video outcome, get back a
normal MP4 plus inspectable artifacts for script, audio, timestamps,
visuals, captions, render metadata, source rights, and review.

## What You Should Understand Fast

- **It is for agent harnesses:** you already use Claude Code, Codex CLI,
  Cursor, or a repo-aware coding agent.
- **It installs into your repo:** the pack materializes
  `.content-machine/skills/` and `.content-machine/flows/` so your agent
  can read them locally.
- **It is results-first:** Reddit stories over gameplay, motion-card
  explainers, SaaS shorts, listicles, micro-docs, longform clips, and
  3D/procedural gameplay backgrounds.
- **It is not a black box:** every meaningful step writes files another
  agent or human can inspect.
- **The README is the tour:** commands and low-level runtime details are
  in the deeper docs.

## See The Results

The default story example is the familiar Reddit-post-over-gameplay
format: full-screen Subway Surfers-style gameplay, a Reddit opener card,
then bold captions over the same gameplay.

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-9-reddit-post-over-gameplay.gif" alt="Reddit post over gameplay showcase" width="280" />
  </a>
</p>

Repo explainer previews show the same system used for OSS onboarding,
motion cards, and 3D/procedural gameplay:

<p align="center">
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.gif" alt="Content Machine Reddit gameplay remix preview" width="180" />
  </a>
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-19-content-machine-motion-cards.gif" alt="Content Machine motion cards preview" width="180" />
  </a>
  <a href="https://github.com/45ck/content-machine/blob/master/docs/demo/demo-20-content-machine-3d-runner.mp4">
    <img src="https://raw.githubusercontent.com/45ck/content-machine/master/docs/demo/demo-20-content-machine-3d-runner.gif" alt="Content Machine 3D runner preview" width="180" />
  </a>
</p>

| Example                                                                                                                      | What It Proves                                                                    | Start Here                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`demo-9`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-9-reddit-post-over-gameplay.mp4)               | Reddit story + gameplay is the default low-attention story lane                   | [`reddit-post-over-gameplay`](docs/user/examples/reddit-post-over-gameplay.md)             |
| [`demo-18`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-18-content-machine-reddit-gameplay-remix.mp4) | The repo can explain itself in a social-native Reddit/gameplay format             | [`content-machine-self-demo`](docs/user/examples/content-machine-self-demo.md)             |
| [`demo-19`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-19-content-machine-motion-cards.mp4)          | Deterministic motion cards can explain a repo without stock footage               | [`content-machine-self-demo`](docs/user/examples/content-machine-self-demo.md)             |
| [`demo-20`](https://github.com/45ck/content-machine/blob/master/docs/demo/demo-20-content-machine-3d-runner.mp4)             | Code-native 3D/procedural motion can be a rights-safe gameplay background         | [`procedural-gameplay-backgrounds`](docs/user/examples/procedural-gameplay-backgrounds.md) |
| [`gallery`](docs/user/showcase/README.md)                                                                                    | The broader lanes: stock explainers, text threads, SaaS, facts, micro-docs, mixed | [`Showcase Gallery`](docs/user/showcase/README.md)                                         |

## Use It In Your Repo

Open your agent inside the repo where you want to make videos and paste
this:

```text
Install Content Machine in this repo and use it as the local short-form
video skill pack.

Follow the Agent Harness Install guide:
https://github.com/45ck/content-machine/blob/master/docs/user/AGENT-HARNESS-INSTALL.md

Do the install for this harness, materialize `.content-machine/`, write
the right root instruction block for Codex CLI, Claude Code, Cursor, or
this repo-aware agent, then verify the local runner.

After install:
- List the installed skills and flows.
- Run doctor-report.
- Tell me what dependencies, API keys, or media assets are missing.
- For any video request, choose the right Content Machine skill or flow
  first.
- Write artifacts under `runs/<run-id>/`.
- Do not call an MP4 ready unless publish-prep passes.
```

Install details are in
[Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md). The quick
operator path is in [Agent Quickstart](docs/user/AGENT-QUICKSTART.md).

Content Machine does not require a special hosted plugin registry. The
agent reads repo-local Markdown skills and flow manifests, then calls
the packaged runtime only when execution is needed.

## Skills At A Glance

| If You Want                              | Give Your Agent This Skill Or Flow                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full topic-to-video short                | [`generate-short`](skills/generate-short/SKILL.md) or [`generate-short.flow`](flows/generate-short.flow)                                                                                         |
| Reddit story over Subway-style gameplay  | [`reddit-post-over-gameplay-short`](skills/reddit-post-over-gameplay-short/SKILL.md), [`reddit-card-overlay`](skills/reddit-card-overlay/SKILL.md)                                               |
| Confession or storytime over gameplay    | [`gameplay-confession-short`](skills/gameplay-confession-short/SKILL.md), [`reddit-story-short`](skills/reddit-story-short/SKILL.md)                                                             |
| Longform video cut into vertical shorts  | [`longform-to-shorts`](skills/longform-to-shorts/SKILL.md), [`longform-clip-extract`](skills/longform-clip-extract/SKILL.md), [`reframe-vertical`](skills/reframe-vertical/SKILL.md)             |
| Product, SaaS, or creator-style ad       | [`saas-problem-solution-short`](skills/saas-problem-solution-short/SKILL.md), [`ugc-avatar-short`](skills/ugc-avatar-short/SKILL.md)                                                             |
| Motion cards, diagrams, or coded visuals | [`motion-card-lesson-short`](skills/motion-card-lesson-short/SKILL.md), [`motion-design-coder`](skills/motion-design-coder/SKILL.md)                                                             |
| 3D/procedural gameplay backgrounds       | [`procedural-gameplay-backgrounds`](skills/procedural-gameplay-backgrounds/SKILL.md)                                                                                                             |
| Hook/title/cover packaging               | [`hook-packaging`](skills/hook-packaging/SKILL.md), [`platform-packaging`](skills/platform-packaging/SKILL.md), [`hook-overlay`](skills/hook-overlay/SKILL.md)                                   |
| Virality and retention review            | [`virality-review`](skills/virality-review/SKILL.md), [`retention-pass`](skills/retention-pass/SKILL.md), [`publish-prep-review`](skills/publish-prep-review/SKILL.md)                           |
| Captions, timing, and review             | [`short-form-captions`](skills/short-form-captions/SKILL.md), [`video-render`](skills/video-render/SKILL.md), [`publish-prep-review`](skills/publish-prep-review/SKILL.md)                       |
| Source media, rights, and reuse          | [`creative-source-scout`](skills/creative-source-scout/SKILL.md), [`source-media-review`](skills/source-media-review/SKILL.md), [`asset-ledger`](skills/asset-ledger/SKILL.md)                   |
| Learn from published results             | [`metrics-feedback-loop`](skills/metrics-feedback-loop/SKILL.md), [`style-profile-library`](skills/style-profile-library/SKILL.md), [`niche-profile-draft`](skills/niche-profile-draft/SKILL.md) |

The complete catalog lives in [`skills/`](skills/README.md), executable
multi-step paths live in [`flows/`](flows/README.md), and deterministic
runtime surfaces live in [`scripts/harness/`](scripts/harness/README.md).

## How It Works

Content Machine splits the work so agents do not have to improvise a
video pipeline from scratch:

- **Skills hold judgment:** when to use a lane, what good output looks
  like, what to reject, and which artifacts should exist.
- **Flows coordinate jobs:** topic-to-video, longform-to-shorts,
  reverse-engineering a winner, diagnostics, and repo showcase runs.
- **Runtime tools execute stages:** script generation, source analysis,
  audio, timestamps, visuals, captions, render, asset ledger, and
  publish-prep review.
- **Artifacts stay local:** runs are meant to be inspectable,
  resumable, reviewable, and safe for another agent to continue.

## What It Can Make

- Reddit/AITA/confession stories over gameplay.
- Stock-footage explainers and faceless mixed-media shorts.
- Motion-card lessons, coded graphics, and 3D/procedural backgrounds.
- Text-message drama, receipt reveals, and social-thread overlays.
- SaaS/product shorts with problem, proof, demo, and CTA beats.
- Fast-facts listicles and micro-documentary breakdowns.
- Longform podcast, interview, talk, or screen-recording clips.
- Reviewed MP4s with provenance, captions, source rights, and quality
  gates.
- Hook, retention, platform-fit, and metrics feedback loops that improve
  future shorts without pretending virality is guaranteed.

## Start Here

- **Use it in your project:**
  [Agent Harness Install](docs/user/AGENT-HARNESS-INSTALL.md)
- **Understand the workflow:**
  [Agent Quickstart](docs/user/AGENT-QUICKSTART.md)
- **Pick a video lane:** [Archetypes](docs/user/ARCHETYPES.md)
- **Review hook/retention:** [Virality And Retention](docs/user/VIRALITY-AND-RETENTION.md)
- **Watch examples:** [Showcase Gallery](docs/user/showcase/README.md)
  and [Demo Gallery](docs/demo/README.md)
- **Browse skills:** [Skills](skills/README.md)
- **Browse flows:** [Flows](flows/README.md)
- **Review readiness:** [Quality And Review](docs/user/QUALITY-AND-REVIEW.md)
- **Find creative sources:** [Creative Sources](docs/user/CREATIVE-SOURCES.md)

## Repo Map

| Path               | Why It Exists                                                   |
| ------------------ | --------------------------------------------------------------- |
| `skills/`          | Agent-readable capability docs and examples                     |
| `flows/`           | Executable multi-step workflow manifests and operator notes     |
| `docs/user/`       | Human install, quickstart, examples, quality, and showcase docs |
| `docs/demo/`       | Preview MP4s/GIFs, manifest, provenance, and maturity labels    |
| `scripts/harness/` | Runtime entrypoints for repo checkouts                          |
| `agent/`           | Packaged install and runner binaries                            |
| `src/harness/`     | Reusable logic behind agent-facing runtime tools                |
| `src/`             | TypeScript media, render, scoring, validation, and providers    |
| `archive/`         | Frozen legacy CLI/control-plane surfaces                        |

## Current Direction

Content Machine is intentionally not a giant all-in-one video app. The
active direction is a small, reliable local runtime that coding agents
can use well: choose the right short-form lane, preserve intermediate
files, review before promotion, and keep the legacy `cm` shell thin.

Read deeper in [Direction](DIRECTION.md),
[Short-Form Roadmap](docs/direction/07-short-form-roadmap-20260424.md),
and [Developer Docs](docs/dev/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributor setup, test
commands, package smoke checks, and low-level runner examples live in
the deeper docs so this README can stay focused on what the project does.

## License

MIT
