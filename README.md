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
cat <<'JSON' | npx tsx scripts/harness/brief-to-script.ts
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
> primary interface. The `cm` CLI remains as a compatibility layer while
> the repo is migrated toward the harness-first direction.

> Start with [`skills/`](skills/README.md),
> [`scripts/harness/`](scripts/harness/README.md),
> [`flows/`](flows/README.md), and [`DIRECTION.md`](DIRECTION.md).

## Start Here

```bash
npm install
```

Node.js 20+ is required.

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
cat <<'JSON' | npx tsx scripts/harness/skill-catalog.ts
{}
JSON

cat <<'JSON' | npx tsx scripts/harness/flow-catalog.ts
{}
JSON
```

Current harness entrypoints:

```bash
npx tsx scripts/harness/doctor-report.ts
npx tsx scripts/harness/flow-catalog.ts
npx tsx scripts/harness/run-flow.ts
npx tsx scripts/harness/skill-catalog.ts
npx tsx scripts/harness/generate-short.ts
npx tsx scripts/harness/brief-to-script.ts
npx tsx scripts/harness/ingest.ts
npx tsx scripts/harness/script-to-audio.ts
npx tsx scripts/harness/timestamps-to-visuals.ts
npx tsx scripts/harness/video-render.ts
npx tsx scripts/harness/publish-prep.ts
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

### Compatibility Path: legacy CLI

```bash
npm run cm -- --help
```

Use the CLI for migration, old automation, or compatibility-only
workflows. The primary docs path is now
[docs/user/HARNESS-QUICKSTART.md](docs/user/HARNESS-QUICKSTART.md).

See [full installation guide](docs/user/INSTALLATION.md) for optional
setup such as Whisper and `ffmpeg`.

## Quick Start

**1. Run the main end-to-end flow**

```bash
cat <<'JSON' | npx tsx scripts/harness/run-flow.ts
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
  npx tsx scripts/harness/ingest.ts
```

**3. Generate a script artifact**

```bash
cat skills/brief-to-script/examples/request.json | \
  npx tsx scripts/harness/brief-to-script.ts
```

**4. Review a render before upload**

```bash
cat skills/publish-prep-review/examples/request.json | \
  npx tsx scripts/harness/publish-prep.ts
```

**5. Run structured environment diagnostics**

```bash
cat skills/doctor-report/examples/request.json | \
  npx tsx scripts/harness/doctor-report.ts
```

The primary user guide is now
[docs/user/HARNESS-QUICKSTART.md](docs/user/HARNESS-QUICKSTART.md). The
legacy CLI quickstart remains in
[docs/user/QUICKSTART.md](docs/user/QUICKSTART.md).

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
- Keep the legacy CLI around for migration and compatibility.

![Pipeline overview](assets/demo/pipeline-preview.svg)

## Documentation

- **[Harness Quickstart](docs/user/HARNESS-QUICKSTART.md)** — primary user path for Claude Code and Codex CLI
- **[skills/](skills/README.md)** — harness-facing skill contracts
- **[flows/](flows/README.md)** — orchestration contracts and executable flows
- **[scripts/harness/](scripts/harness/README.md)** — JSON-stdio entrypoints and execution model
- **[Direction](DIRECTION.md)** — migration plan, cut lines, and archive policy
- **[User Guide](docs/user/README.md)** — harness-first user docs plus CLI compatibility docs
- **[Developer Docs](docs/dev/README.md)** — active architecture, registries, and legacy engineering docs
- **[Reference](docs/reference/)** — generated references, environment variables, glossary, and CLI contracts

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
npx tsx scripts/harness/skill-catalog.ts
```

## License

MIT
