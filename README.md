# Content Machine

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="assets/banner.light.png" />
    <img src="assets/banner.light.png" alt="content-machine banner" width="100%" />
  </picture>
</p>

**Short-form video skill pack for Claude Code, Codex CLI, and similar coding-agent CLIs.**

Content Machine is moving away from a monolithic "AI video agent" and
toward repo-local skills, `45ck/prompt-language` flows, and deterministic
runtime scripts that coding-agent CLIs can call directly.

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

<p align="center">
  <img src="assets/demo/demo-1-split-screen.gif" alt="Split screen demo" width="32%" />
  <img src="assets/demo/demo-2-subway-captions.gif" alt="Caption styles demo" width="32%" />
  <img src="assets/demo/demo-4-latest-news.gif" alt="Latest news demo" width="32%" />
</p>

> Early development. Skills, flows, and runtime scripts are now the
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

### Primary Path: Coding-Agent CLIs

Use these three surfaces together:

- [`skills/`](skills/README.md): importable short-form video skills
- [`flows/`](flows/README.md): `45ck/prompt-language` docs and manifests
- [`scripts/harness/`](scripts/harness/README.md): repo-side JSON-stdio runtime entrypoints

If you are deciding where to start:

- Start with a skill when you want one capability.
- Start with a flow when you want a full multi-step path.
- Start with `scripts/harness/` only when you need the exact repo-side executable
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

Current repo-side entrypoints:

```bash
node --import tsx scripts/harness/doctor-report.ts
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
node --import tsx scripts/harness/skill-catalog.ts
node --import tsx scripts/harness/generate-short.ts
node --import tsx scripts/harness/brief-to-script.ts
node --import tsx scripts/harness/ingest.ts
node --import tsx scripts/harness/longform-highlight-select.ts
node --import tsx scripts/harness/highlight-approval.ts
node --import tsx scripts/harness/boundary-snap.ts
node --import tsx scripts/harness/source-media-analyze.ts
node --import tsx scripts/harness/media-index.ts
node --import tsx scripts/harness/style-profile-library.ts
node --import tsx scripts/harness/script-to-audio.ts
node --import tsx scripts/harness/timestamps-to-visuals.ts
node --import tsx scripts/harness/video-render.ts
node --import tsx scripts/harness/publish-prep.ts
node --import tsx scripts/harness/install-skill-pack.ts
```

If you want these skills inside another project, install the package
there and materialize a local pack:

```bash
npm install @45ck/content-machine

cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true
}
JSON
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

**3. Generate a script**

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
[docs/user/AGENT-QUICKSTART.md](docs/user/AGENT-QUICKSTART.md). The
archived CLI notes live under
[archive/legacy-cli/](archive/legacy-cli/README.md).

## How The Repo Is Shaped

- `skills/` defines when to use a capability, what it expects, and what
  files it should return.
- `flows/` defines `45ck/prompt-language` orchestration over one or more skills.
- `scripts/harness/` exposes deterministic JSON-stdio entrypoints that
  execute the work.
- `src/` still contains the media logic for captions, sync,
  reverse-engineering, render, and publish prep.
- `docs/direction/` is the source of truth for the migration plan and
  cut lines.

Typical output flow:

```text
skill request
  -> flow or direct runtime script
  -> files on disk
  -> optional render / review / evaluation outputs
```

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
- **[skills/](skills/README.md)** — agent-facing skill docs
- **[flows/](flows/README.md)** — `45ck/prompt-language` docs and executable flows
- **[scripts/harness/](scripts/harness/README.md)** — repo-side JSON-stdio entrypoints and execution model
- **[Direction](DIRECTION.md)** — migration plan, cut lines, and archive policy
- **[User Guide](docs/user/README.md)** — skill-pack docs
- **[Developer Docs](docs/dev/README.md)** — active architecture, registries, and legacy engineering docs
- **[Reference](docs/reference/)** — generated references, environment variables, glossary, and CLI details
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
