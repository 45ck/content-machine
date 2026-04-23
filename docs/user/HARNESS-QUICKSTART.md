# Harness Quickstart

This is the primary path for using Content Machine today.

Use this path when you are working from Claude Code, Codex CLI, or a
similar coding harness that can read repo-local docs and invoke JSON
stdio subprocesses.

## The three surfaces

- `skills/` defines the intent contract: when to use something, what
  input it needs, and what artifacts it should produce.
- `flows/` defines orchestration: which skills run, in what order, and
  what marks success.
- `scripts/harness/` is the executable surface: JSON on stdin, JSON on
  stdout, typed artifacts on disk.

Start with `skills/` when you want one capability. Start with `flows/`
when you want a multi-step path.

## Step 1: Install dependencies

```bash
npm install
```

Node.js 20+ is required.

## Step 2: Discover what is shipped

List the repo-local skills:

```bash
cat <<'JSON' | npx tsx scripts/harness/skill-catalog.ts
{}
JSON
```

List the repo-local flows:

```bash
cat <<'JSON' | npx tsx scripts/harness/flow-catalog.ts
{}
JSON
```

## Step 3: Run the main end-to-end flow

`generate-short` is the default multi-step path:

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

This writes run-scoped artifacts under `runs/demo-run/` by default.

## Step 4: Run a single skill directly

Generate only a script artifact:

```bash
cat skills/brief-to-script/examples/request.json | \
  npx tsx scripts/harness/brief-to-script.ts
```

Reverse-engineer a reference short:

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  npx tsx scripts/harness/ingest.ts
```

Run structured diagnostics:

```bash
cat skills/doctor-report/examples/request.json | \
  npx tsx scripts/harness/doctor-report.ts
```

## Step 5: Read the contract next to the surface

- Skill contract: [`../../skills/README.md`](../../skills/README.md)
- Flow contract: [`../../flows/README.md`](../../flows/README.md)
- Executable entrypoints: [`../../scripts/harness/README.md`](../../scripts/harness/README.md)
- Repo direction: [`../../DIRECTION.md`](../../DIRECTION.md)

## Legacy CLI

The `cm` CLI still exists, but it is now a thin compatibility shell
rather than the primary interface.

If you need it, use:

- `npm run cm -- --help`
- [Legacy CLI Archive](../../archive/legacy-cli/README.md)
