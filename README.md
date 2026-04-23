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

> Early development. The preferred integration path is now skills plus
> harness scripts; the legacy CLI remains available while the repo is
> migrated toward the harness-first direction.

> Start with [`skills/`](skills/README.md),
> [`scripts/harness/`](scripts/harness/README.md),
> [`flows/`](flows/README.md), and [`DIRECTION.md`](DIRECTION.md).

## Start Here

```bash
npm install
```

### For Claude Code and Codex CLI

Use the repo-local skills and the JSON-stdio harness entrypoints:

```bash
npx tsx scripts/harness/flow-catalog.ts
npx tsx scripts/harness/run-flow.ts
npx tsx scripts/harness/skill-catalog.ts
npx tsx scripts/harness/generate-short.ts
npx tsx scripts/harness/brief-to-script.ts
npx tsx scripts/harness/ingest.ts
npx tsx scripts/harness/publish-prep.ts
```

Starter skills:

- [skills/skill-catalog/SKILL.md](skills/skill-catalog/SKILL.md)
- [skills/generate-short/SKILL.md](skills/generate-short/SKILL.md)
- [skills/brief-to-script/SKILL.md](skills/brief-to-script/SKILL.md)
- [skills/reverse-engineer-winner/SKILL.md](skills/reverse-engineer-winner/SKILL.md)
- [skills/publish-prep-review/SKILL.md](skills/publish-prep-review/SKILL.md)

### For legacy CLI usage

```bash
npm run cm -- --help
```

Requires Node.js >= 20. See [full installation guide](docs/user/INSTALLATION.md) for optional setup (Whisper, ffmpeg).

## Quick Start

**1. Run the full generate-short flow**

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

The existing CLI quickstart remains in [docs/user/QUICKSTART.md](docs/user/QUICKSTART.md).

## What You Can Make

| Archetype    | What it produces            | Example                                                |
| ------------ | --------------------------- | ------------------------------------------------------ |
| **listicle** | "5 things..." numbered tips | `cm generate "5 Docker tips" --archetype listicle`     |
| **versus**   | Side-by-side comparison     | `cm generate "Redis vs Postgres" --archetype versus`   |
| **howto**    | Step-by-step tutorial       | `cm generate "Deploy to AWS" --archetype howto`        |
| **myth**     | Myth vs reality debunk      | `cm generate "JavaScript myths" --archetype myth`      |
| **story**    | Narrative with a hook       | `cm generate "How Stripe was built" --archetype story` |
| **hot-take** | Provocative opinion piece   | `cm generate "REST is dead" --archetype hot-take`      |

More examples: [docs/user/EXAMPLES.md](docs/user/EXAMPLES.md)

[![Gemini image-led short preview](assets/demo/demo-5-gemini-2026-feels-like-2016.gif)](docs/user/examples/gemini-image-shorts.md)

## How It Works

The legacy CLI pipeline still exists and remains the bridge to many
runtime capabilities:

```
topic → script → audio + timestamps → visuals → video.mp4
```

```bash
# Or run stages individually
cm script  --topic "Redis vs PostgreSQL"       # LLM generates script
cm audio   --input script.json                 # TTS + word-level timestamps
cm visuals --input timestamps.json             # Stock footage matching
cm render  --input visuals.json                # Remotion renders MP4
```

![Pipeline overview](assets/demo/pipeline-preview.svg)

## Documentation

- **[skills/](skills/README.md)** — starter harness skills for Claude Code and Codex CLI
- **[scripts/harness/](scripts/harness/README.md)** — JSON-stdio deterministic entrypoints
- **[flows/](flows/README.md)** — executable and planned flow docs for agent-driven orchestration
- **[User Guide](docs/user/README.md)** — installation, configuration, CLI reference, examples
- **[Developer Docs](docs/dev/README.md)** — architecture, contributing guides, specs
- **[Reference](docs/reference/)** — generated CLI references, environment variables, glossary

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine && npm install && cp .env.example .env
npm run cm -- --help
```

## License

MIT
