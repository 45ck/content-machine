# Content Machine

[![CI](https://github.com/45ck/content-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/45ck/content-machine/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%4045ck%2Fcontent-machine)](https://www.npmjs.com/package/@45ck/content-machine)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/banner.light.png" />
    <img src="assets/banner.light.png" alt="content-machine banner" width="100%" />
  </picture>
</p>

**Harness-first content runtime for Claude Code, Codex CLI, and similar coding agents.**

Content Machine is moving away from a monolithic "AI video agent" and
toward repo-local skills, typed artifacts, and deterministic runtime
surfaces that coding harnesses can call directly.

```bash
cat <<'JSON' | node --import tsx scripts/harness/brief-to-script.ts
{
  "topic": "Redis vs PostgreSQL for caching",
  "archetype": "versus",
  "targetDuration": 35,
  "outputPath": "output/harness/script/script.json"
}
JSON
```

<p align="center">
  <img src="assets/demo/demo-1-split-screen.gif" alt="Split screen demo" width="32%" />
  <img src="assets/demo/demo-2-subway-captions.gif" alt="Caption styles demo" width="32%" />
  <img src="assets/demo/demo-4-latest-news.gif" alt="Latest news demo" width="32%" />
</p>

> Early development. Skills, flows, and harness scripts are now the
> primary interface. The legacy CLI control plane has been moved into
> [`archive/legacy-cli/`](archive/legacy-cli/README.md); the remaining
> `cm` shell is intentionally thin.

> Start with [`skills/`](skills/README.md),
> [`scripts/harness/`](scripts/harness/README.md),
> [`flows/`](flows/README.md), and [`DIRECTION.md`](DIRECTION.md).

## Start Here

```bash
npm install
```

Node.js 20.6+ is required.

### Primary Path: Claude Code and Codex CLI

Use these three surfaces together:

- [`skills/`](skills/README.md): intent contracts for repo-local skills
- [`flows/`](flows/README.md): orchestration contracts for multi-step runs
- [`scripts/harness/`](scripts/harness/README.md): executable JSON-stdio entrypoints

If you are deciding where to start:

- Start with a skill when you want one capability.
- Start with a flow when you want a full multi-step path.
- Start with `scripts/harness/` only when you need the exact executable
  entrypoint.

Discover what is shipped:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON

cat <<'JSON' | node --import tsx scripts/harness/flow-catalog.ts
{}
JSON
```

Current harness entrypoints:

```bash
node --import tsx scripts/harness/doctor-report.ts
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
node --import tsx scripts/harness/skill-catalog.ts
node --import tsx scripts/harness/generate-short.ts
node --import tsx scripts/harness/brief-to-script.ts
node --import tsx scripts/harness/ingest.ts
node --import tsx scripts/harness/script-to-audio.ts
node --import tsx scripts/harness/timestamps-to-visuals.ts
node --import tsx scripts/harness/video-render.ts
node --import tsx scripts/harness/publish-prep.ts
```

Shipped starter skills:

- [skills/doctor-report/SKILL.md](skills/doctor-report/SKILL.md)
- [skills/skill-catalog/SKILL.md](skills/skill-catalog/SKILL.md)
- [skills/generate-short/SKILL.md](skills/generate-short/SKILL.md)
- [skills/brief-to-script/SKILL.md](skills/brief-to-script/SKILL.md)
- [skills/reverse-engineer-winner/SKILL.md](skills/reverse-engineer-winner/SKILL.md)
- [skills/script-to-audio/SKILL.md](skills/script-to-audio/SKILL.md)
- [skills/timestamps-to-visuals/SKILL.md](skills/timestamps-to-visuals/SKILL.md)
- [skills/video-render/SKILL.md](skills/video-render/SKILL.md)
- [skills/publish-prep-review/SKILL.md](skills/publish-prep-review/SKILL.md)

### Thin `cm` Shell

```bash
npm run cm -- --help
```

Only `config`, `doctor`, `mcp`, and `render` remain live under `cm`.
Everything else now lives in [`archive/legacy-cli/`](archive/legacy-cli/README.md).

See [full installation guide](docs/user/INSTALLATION.md) for optional
setup such as Whisper and `ffmpeg`.

## Quick Start

**1. Run the main end-to-end flow**

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

**2. Reverse-engineer a reference short**

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/ingest.ts
```

**3. Generate a script artifact**

```bash
cat skills/brief-to-script/examples/request.json | \
  node --import tsx scripts/harness/brief-to-script.ts
```

**4. Review a render before upload**

```bash
cat skills/publish-prep-review/examples/request.json | \
  node --import tsx scripts/harness/publish-prep.ts
```

**5. Run structured environment diagnostics**

```bash
cat skills/doctor-report/examples/request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

The primary user guide is now
[docs/user/HARNESS-QUICKSTART.md](docs/user/HARNESS-QUICKSTART.md). The
archived CLI notes live under
[archive/legacy-cli/](archive/legacy-cli/README.md).

## How The Repo Is Shaped

- `skills/` defines when to use a capability, what it expects, and what
  artifacts it should return.
- `flows/` defines multi-step orchestration over one or more skills.
- `scripts/harness/` exposes deterministic JSON-stdio entrypoints that
  execute the work.
- `src/` still contains the small TypeScript kernel for media logic,
  captions, sync, reverse-engineering, and artifact contracts.
- `docs/direction/` is the source of truth for the migration plan and
  cut lines.

Typical artifact flow:

```text
skill request
  -> flow or direct harness script
  -> typed artifacts on disk
  -> optional render / review / evaluation outputs
```

Run-scoped flows write under `runs/<run-id>/` by default. Direct skills
can also write to explicit output paths.

## What You Can Do

- Generate a short-form video artifact chain from a topic.
- Reverse-engineer a winning reference short into structured artifacts.
- Generate only scripts, audio, visuals, or renders when needed.
- Run structured diagnostics before expensive generation work.
- Use the thin `cm` shell only for config, diagnostics, MCP, or render compatibility.

![Pipeline overview](assets/demo/pipeline-preview.svg)

## Documentation

- **[Harness Quickstart](docs/user/HARNESS-QUICKSTART.md)** — primary user path for Claude Code and Codex CLI
- **[skills/](skills/README.md)** — harness-facing skill contracts
- **[flows/](flows/README.md)** — orchestration contracts and executable flows
- **[scripts/harness/](scripts/harness/README.md)** — JSON-stdio entrypoints and execution model
- **[Direction](DIRECTION.md)** — migration plan, cut lines, and archive policy
- **[User Guide](docs/user/README.md)** — harness-first user docs
- **[Developer Docs](docs/dev/README.md)** — active architecture, registries, and legacy engineering docs
- **[Reference](docs/reference/)** — generated references, environment variables, glossary, and CLI contracts
- **[Archive](archive/README.md)** — frozen legacy control-plane code and notes

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
node --import tsx scripts/harness/skill-catalog.ts
```

## License

MIT
