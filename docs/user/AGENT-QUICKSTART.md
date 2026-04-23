# Agent Quickstart

This is the primary path for using Content Machine today.

Use it when you are working from Claude Code, Codex CLI, or a similar
coding-agent CLI that can read repo-local docs and invoke JSON-stdio
subprocesses.

## The three surfaces

- `skills/` defines when to use something, what input it needs, and
  what files it should produce.
- `flows/` defines `45ck/prompt-language` orchestration: which skills
  run, in what order, and what marks success.
- `scripts/harness/` is the repo-side executable surface: JSON on stdin,
  JSON on stdout, files on disk.

Start with `skills/` when you want one capability. Start with `flows/`
when you want a multi-step path.

## Step 1: Install dependencies

```bash
npm install
```

Node.js 20.6+ is required.

## Step 2: Discover what is shipped

List the repo-local skills:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON
```

Or:

```bash
printf '{}\n' | npm run agent:skill-catalog
```

List the repo-local flows:

```bash
cat <<'JSON' | node --import tsx scripts/harness/flow-catalog.ts
{}
JSON
```

Or:

```bash
printf '{}\n' | npm run agent:flow-catalog
```

## Step 3: Run the main full-video path

`generate-short` is the default topic-to-video path:

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

This writes run-scoped files under `runs/demo-run/` by default.

If you prefer npm aliases, the same runner is available as
`npm run agent:run-flow`.

## Step 4: Pull a reference video or run one skill directly

Generate only a script:

```bash
cat skills/brief-to-script/examples/request.json | \
  node --import tsx scripts/harness/brief-to-script.ts
```

Reverse-engineer a reference short from a local file or supported URL.
URL inputs use `yt-dlp` before analysis:

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/ingest.ts
```

Run diagnostics, including `ffmpeg`, `ffprobe`, and `yt-dlp` checks:

```bash
cat skills/doctor-report/examples/request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

## Step 5: Install the pack into another project

If you want these skills inside a separate coding-agent project, install
the package there and materialize a local copy:

```bash
npm install @45ck/content-machine

cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true
}
JSON
```

That creates `.content-machine/skills/` and `.content-machine/flows/`
with `SKILL.md` files already pointed at the installed package runner.

## Step 6: Read the guide next to the surface

- Skill guide: [`../../skills/README.md`](../../skills/README.md)
- Flow guide: [`../../flows/README.md`](../../flows/README.md)
- Repo-side entrypoints: [`../../scripts/harness/README.md`](../../scripts/harness/README.md)
- Repo direction: [`../../DIRECTION.md`](../../DIRECTION.md)

## Legacy CLI

The `cm` CLI still exists, but it is now a thin compatibility shell
rather than the primary interface.

If you need it, use:

- `npm run cm -- --help`
- [Legacy CLI Archive](../../archive/legacy-cli/README.md)
