# Agent Quickstart

This is the primary path for using Content Machine today.

Use it when you are working from Claude Code, Codex CLI, or a similar
coding-agent CLI that can read repo-local docs and optionally invoke the
repo's runners.

## Install Mode

- Existing project: use
  [Agent Harness Install](AGENT-HARNESS-INSTALL.md) to materialize
  `.content-machine/skills/`, `.content-machine/flows/`, and
  `.content-machine/AGENTS.md`.
- Content Machine checkout: use the repo-local `skills/`, `flows/`, and
  `scripts/harness/` paths in this guide.

## Talk To Your Agent First

After install, you normally do not need to memorize commands. Ask your
agent for the outcome and let it read the local `skills/`, `flows/`, and
runtime docs.

Try:

> Use Content Machine to make a 35-second TikTok-style explainer about
> Redis vs PostgreSQL for caching. Pick the best lane, run the default
> `generate-short` flow, and only call it ready if publish-prep passes.

If you already know the format:

> Use the `reddit-post-over-gameplay` lane to turn this story into a
> vertical short. Keep gameplay full-screen, show a Reddit opener card
> for 3-5 seconds, add bold captions, and run the review gate.

## The three surfaces

- `skills/` or `.content-machine/skills/` defines when to use
  something, what input it needs, and how to do it well.
- `flows/` or `.content-machine/flows/` defines `45ck/prompt-language`
  orchestration: which skills run, in what order, and what marks
  success.
- `scripts/harness/` is the repo-checkout executable surface;
  installed projects use `npx --no-install cm-agent <tool>` instead.

Start with `skills/` when you want one capability. Start with `flows/`
when you want a multi-step path.

## Step 1: Choose install mode

For an existing agent project:

```bash
npm install --save-dev @45ck/content-machine
npx cm-install --target .content-machine --write-instructions
npx --no-install cm-agent list
```

Use `--instruction-file CLAUDE.md` with `cm-install` when Claude Code
should load the root instruction block from `CLAUDE.md`.

For a Content Machine checkout:

```bash
npm install
```

Node.js 20.6+ is required.

The expected operator model is an existing coding-agent harness such as
Claude Code, Codex CLI, Cursor, or similar. Ask the harness for the
outcome and let it read the skills/flows and call the JSON-stdio runtime
when needed; the command examples are for automation and debugging.

## Step 2: Discover and verify what is shipped

Installed project:

```bash
cat <<'JSON' | npx --no-install cm-agent skill-catalog
{
  "skillsDir": ".content-machine/skills",
  "includeExamples": true
}
JSON

cat <<'JSON' | npx --no-install cm-agent flow-catalog
{
  "flowsDir": ".content-machine/flows"
}
JSON
```

Then run diagnostics before generation:

```bash
cat <<'JSON' | npx --no-install cm-agent doctor-report
{
  "strict": false
}
JSON
```

Repo checkout:

```bash
cat <<'JSON' | node --import tsx scripts/harness/skill-catalog.ts
{}
JSON
```

Or:

```bash
printf '{}\n' | npm run agent:skill-catalog
```

```bash
cat <<'JSON' | node --import tsx scripts/harness/flow-catalog.ts
{}
JSON
```

Or:

```bash
printf '{}\n' | npm run agent:flow-catalog
```

Then run diagnostics:

```bash
printf '{"strict":false}\n' | npm run agent:doctor-report
```

Golden first-run order:

1. Confirm Node.js 20.6+.
2. Install or use the repo checkout.
3. List skills and flows.
4. Run `doctor-report`.
5. Choose the archetype.
6. Run `generate-short`.
7. Inspect `publish-prep` before calling the MP4 ready.

For longform source videos, replace step 6 with
`longform-to-shorts`: select candidate clips first, get approval, then
run `longform-clip-extract`, reframe if needed, and render only the
approved ranges.

## Step 3: Choose the archetype

Before generating, pick the lane. This prevents generic "topic to video"
runs from turning into weak stock montages or the wrong Reddit/gameplay
layout.

- Use [Archetypes](ARCHETYPES.md) for the status table and routing
  rules.
- Use `reddit-post-over-gameplay` as the default Reddit/story mode.
- Use `reddit-story-split-screen` only when top story footage plus
  bottom gameplay is explicitly wanted.
- Use [Quality And Review](QUALITY-AND-REVIEW.md) before promoting a
  render as ready.

## Step 4: Optional no-key smoke test

If you only want to prove the artifact chain without API keys, use the
no-key smoke path in
[`content-machine-self-demo`](examples/content-machine-self-demo.md#no-key-smoke-test).
It creates mock audio, mock visuals, caption sidecars, render metadata,
and a placeholder MP4. It is not a publishable demo.

## Step 5: Run the main full-video path

`generate-short` is the default topic-to-video path. Use this after
provider credentials are configured, for example `OPENAI_API_KEY` plus a
visual provider key such as `PEXELS_API_KEY` when using Pexels visuals:

Use the command form when scripting automation. Inside Claude Code,
Codex CLI, Cursor, or another agent harness, the normal interaction is
to ask for the outcome and let the agent choose the skill or flow.

Installed project:

```bash
cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": ".content-machine/flows",
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

Repo checkout:

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

By default the review gate is fail-closed: if `publish-prep` says the
short is not ready, `generate-short` exits non-zero instead of quietly
handing back junk. The run also writes
`runs/demo-run/provenance/asset-ledger.json` and passes it into
publish-prep, so stock footage, user media, gameplay, or external audio
must have rights evidence before the run is considered publish-ready.

If you prefer npm aliases, the same runner is available as
`npm run agent:run-flow`.

## Step 6: Plan longform clips before rendering

Use this when the input is a podcast, interview, talk, screen recording,
or other long source file. The flow writes candidate and handoff
artifacts; it does not pretend approved JSON is already a final MP4.

Installed project:

```bash
cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": ".content-machine/flows",
  "flow": "longform-to-shorts",
  "runId": "source-clips",
  "input": {
    "timestampsPath": "input/source/timestamps.json",
    "sourceMediaPath": "input/source/source.mp4",
    "maxCandidates": 3
  }
}
JSON
```

Repo checkout:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "longform-to-shorts",
  "runId": "source-clips",
  "input": {
    "timestampsPath": "input/source/timestamps.json",
    "sourceMediaPath": "input/source/source.mp4",
    "maxCandidates": 3
  }
}
JSON
```

Review `runs/source-clips/longform-to-shorts/handoff/render-handoff.v1.json`,
approve a candidate, then run `longform-clip-extract` to create
clip-local render inputs before calling `video-render`.

Installed command form:

```bash
cat <<'JSON' | npx --no-install cm-agent longform-clip-extract
{
  "sourceMediaPath": "input/source/source.mp4",
  "approvalPath": "runs/source-clips/longform-to-shorts/highlights/highlight-approval.v1.json",
  "boundarySnapPath": "runs/source-clips/longform-to-shorts/highlights/boundary-snap.v1.json",
  "timestampsPath": "input/source/timestamps.json",
  "outputDir": "runs/source-clips/extracted"
}
JSON
```

## Step 7: Pull a reference video or run one skill directly

Installed project:

```bash
cat .content-machine/skills/brief-to-script/examples/request.json | \
  npx --no-install cm-agent brief-to-script

cat .content-machine/skills/reverse-engineer-winner/examples/request.json | \
  npx --no-install cm-agent reverse-engineer-winner

cat <<'JSON' | npx --no-install cm-agent publish-prep
{
  "videoPath": "runs/demo-run/render/video.mp4",
  "scriptPath": "runs/demo-run/script/script.json",
  "assetLedgerPath": "runs/demo-run/provenance/asset-ledger.json",
  "outputDir": "runs/demo-run/publish-prep",
  "platform": "tiktok",
  "validate": { "cadence": true, "audioSignal": true }
}
JSON
```

Repo checkout:

Generate only a script:

```bash
cat skills/brief-to-script/examples/request.json | \
  node --import tsx scripts/harness/brief-to-script.ts
```

Reverse-engineer a reference short from a local file or supported URL.
URL inputs use `yt-dlp` before analysis; only use URLs you own, have
permission to analyze, or can otherwise use under the source terms:

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/reverse-engineer-winner.ts
```

Run diagnostics, including `ffmpeg`, `ffprobe`, and `yt-dlp` checks:

```bash
cat skills/doctor-report/examples/request.json | \
  node --import tsx scripts/harness/doctor-report.ts
```

Run the review gate directly when you want a hard ready-to-post verdict:

```bash
cat <<'JSON' | node --import tsx scripts/harness/publish-prep.ts
{
  "videoPath": "runs/demo-run/render/video.mp4",
  "scriptPath": "runs/demo-run/script/script.json",
  "assetLedgerPath": "runs/demo-run/provenance/asset-ledger.json",
  "outputDir": "runs/demo-run/publish-prep",
  "platform": "tiktok",
  "validate": { "cadence": true, "audioSignal": true }
}
JSON
```

## Appendix: Install the pack into another project

If you are already working from this repo, skip this during first-run
generation. Use it only when you want these skills inside a separate
coding-agent project:

```bash
npm install --save-dev @45ck/content-machine

npx cm-install --target .content-machine --write-instructions
```

That creates `.content-machine/skills/` and `.content-machine/flows/`
with `SKILL.md` files already pointed at the installed package runner.
It also writes `.content-machine/README.md` and
`.content-machine/AGENTS.md`, plus a managed root instruction block when
`--write-instructions` is used. These tell the harness how to discover
skills, pass `flowsDir`, run diagnostics, and validate outputs.

## Read the guide next to the surface

- Archetype guide: [`ARCHETYPES.md`](ARCHETYPES.md)
- Review guide: [`QUALITY-AND-REVIEW.md`](QUALITY-AND-REVIEW.md)
- Skill guide: [`../../skills/README.md`](../../skills/README.md)
- Flow guide: [`../../flows/README.md`](../../flows/README.md)
- Optional repo-side runners: [`../../scripts/harness/README.md`](../../scripts/harness/README.md)
- Repo direction: [`../../DIRECTION.md`](../../DIRECTION.md)

## Legacy CLI

The `cm` CLI still exists, but it is now a thin compatibility shell
rather than the primary interface.

If you need it, use:

- `npm run cm -- --help`
- [Legacy CLI Archive](../../archive/legacy-cli/README.md)
