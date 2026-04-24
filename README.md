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

It helps Claude Code, Codex CLI, and similar agents create TikToks,
Instagram Reels, and YouTube Shorts by calling repo-local skills,
flows, and deterministic media scripts.

The goal is simple: turn a topic or source video into a high-quality
vertical short with inspectable artifacts at every step.

```text
source or topic
  -> script / highlight selection
  -> audio + timestamps
  -> visuals
  -> captions + render
  -> quality-gated MP4
```

<p align="center">
  <img src="assets/demo/demo-1-split-screen.gif" alt="Split screen demo" width="32%" />
  <img src="assets/demo/demo-2-subway-captions.gif" alt="Caption styles demo" width="32%" />
  <img src="assets/demo/demo-4-latest-news.gif" alt="Latest news demo" width="32%" />
</p>

## Current Focus

Content Machine is not trying to be a giant all-in-one video app. The
active direction is a small, reliable local runtime that agents can use
well:

- pick strong short-form moments from long videos
- approve highlights before expensive render work
- generate scripts, audio, visuals, captions, and MP4s as separate files
- keep every step inspectable and repeatable
- use skills and flows as the main interface, with `cm` kept thin

Read the current build plan:
[Short-Form Roadmap](docs/direction/07-short-form-roadmap-20260424.md).

## Quick Start

Requirements: Node.js 20.6+.

```bash
npm install
```

Run diagnostics:

```bash
cat skills/doctor-report/examples/request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

Generate a script from a brief:

```bash
cat <<'JSON' | node --import tsx scripts/harness/brief-to-script.ts
{
  "topic": "Redis vs PostgreSQL for caching",
  "archetype": "versus",
  "targetDuration": 35,
  "outputPath": "output/content-machine/script/script.json"
}
JSON
```

Run the main short-form flow:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "generate-short",
  "runId": "demo-run",
  "input": {
    "topic": "Redis vs PostgreSQL for caching",
    "audio": { "voice": "af_heart" },
    "visuals": { "provider": "pexels", "orientation": "portrait" },
    "render": { "fps": 30, "downloadAssets": true },
    "publishPrep": { "enabled": true, "platform": "tiktok" }
  }
}
JSON
```

The full beginner path is here:
[Agent Quickstart](docs/user/AGENT-QUICKSTART.md).

## How To Use It

Use one of three surfaces:

- [skills/](skills/README.md) when an agent needs one capability
- [flows/](flows/README.md) when an agent needs a multi-step workflow
- [scripts/harness/](scripts/harness/README.md) when you need the exact
  executable JSON-stdio entrypoint

The remaining `cm` CLI is intentionally small:

```bash
npm run cm -- --help
```

Use it for config, diagnostics, MCP, and render compatibility. Archived
legacy CLI notes live in [archive/legacy-cli/](archive/legacy-cli/README.md).

## Read Deeper

Start here, then follow links downward:

- [Agent Quickstart](docs/user/AGENT-QUICKSTART.md) - quickest user path
- [Skills](skills/README.md) - all agent-facing capabilities
- [Flows](flows/README.md) - orchestration patterns
- [Harness Scripts](scripts/harness/README.md) - executable runtime entrypoints
- [Short-Form Roadmap](docs/direction/07-short-form-roadmap-20260424.md) -
  what we are building next and why
- [Direction](DIRECTION.md) - product boundaries and migration decisions
- [User Guide](docs/user/README.md) - broader usage docs
- [Developer Docs](docs/dev/README.md) - architecture, registries, and internals
- [Research](docs/research/00-SUMMARY-20260102.md) - reference repo findings and experiments
- [Reference](docs/reference/) - generated glossary, facts, and CLI reference
- [Archive](archive/README.md) - frozen legacy code and notes

## Repo Map

```text
skills/            agent-readable capability docs
flows/             multi-step prompt-language workflows
scripts/harness/   JSON-stdio runtime entrypoints
src/               TypeScript media, render, scoring, and provider logic
docs/              user, developer, direction, research, and reference docs
archive/           retired legacy surfaces
```

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
