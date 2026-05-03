# Agent Harness Install

Use this when you want Content Machine inside an existing coding-agent
project instead of working from the `content-machine` repo checkout.

The target user experience is simple: tell your agent to install the
pack, then ask for video outcomes. The agent should read the local
skills and flows, run JSON-stdio tools when execution is needed, and
return inspectable artifacts instead of hiding the pipeline.

## Copy-Paste Prompt

Paste this into Claude Code, Codex CLI, Cursor, or another repo-aware
agent from the project where you want to make videos:

```text
Install Content Machine in this repo and use it as the local short-form
video skill pack.

Do this:
1. Run `npm install --save-dev @45ck/content-machine`.
2. Run `npx cm-install --target .content-machine --write-instructions`
   for Codex-style `AGENTS.md` loading, or add
   `--instruction-file CLAUDE.md` for Claude Code.
3. Read `.content-machine/README.md` and `.content-machine/AGENTS.md`.
4. Verify the runner with `npx --no-install cm-agent list`.
5. Run doctor-report and tell me what is missing before generating real videos.

After install, when I ask for a short, choose the right Content Machine
skill or flow first, write artifacts under `runs/<run-id>/`, and only
call an MP4 ready when publish-prep passes.
```

If you want the exact command form:

Codex CLI or generic `AGENTS.md` harness:

```bash
npm install --save-dev @45ck/content-machine

npx cm-install --target .content-machine --write-instructions
```

Claude Code:

```bash
npm install --save-dev @45ck/content-machine

npx cm-install --target .content-machine --write-instructions --instruction-file CLAUDE.md
```

Use `npx cm-install --target .content-machine --overwrite --write-instructions`
when intentionally refreshing an existing `.content-machine/` pack after
upgrading the npm package.
Preserve the same `--instruction-file` value when refreshing.

## First-Run Order

Use this order before generating real videos:

1. Confirm Node.js 20.6+ with `node --version`.
2. Install the pack with `cm-install`.
3. Verify the runner with `npx --no-install cm-agent list`.
4. List skills and flows so the agent sees the local surface.
5. Run `doctor-report` and fix missing dependencies or keys.
6. Run `generate-short` or a narrower skill.
7. Inspect `publish-prep` before calling the MP4 ready.

## What Gets Installed

| Path                         | Purpose                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `.content-machine/README.md` | Human and agent orientation for the materialized pack                      |
| `.content-machine/AGENTS.md` | Agent-facing operating rules that can be copied into root instructions     |
| `.content-machine/skills/`   | `SKILL.md` files that explain when and how to use each capability          |
| `.content-machine/flows/`    | Optional `.flow` manifests for multi-step jobs                             |
| `node_modules/@45ck/...`     | Runtime implementation, `cm-agent`, `cm-install`, and `agent/run-tool.mjs` |
| `AGENTS.md` or `CLAUDE.md`   | Optional managed root block when `--write-instructions` is used            |

The copied skill docs are rewritten to call the installed package
runner, so agents do not need the source repo checkout.

## Harness Matrix

| Harness                 | Install Pattern                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Codex CLI               | Use `--write-instructions` so the managed block lands in project `AGENTS.md`, then ask Codex for video outcomes.    |
| Claude Code             | Use `--write-instructions --instruction-file CLAUDE.md` so Claude loads the managed block from project `CLAUDE.md`. |
| Cursor or editor agents | Run the install command in the project terminal, then mention `.content-machine/skills/` in chat or project rules.  |
| Generic shell agent     | Give it the command block and tell it to use `npx --no-install cm-agent <tool>` for JSON-stdio runtime calls.       |

Content Machine does not require a special native plugin registry. The
portable install works because most coding agents can read repo-local
Markdown and run local commands. If your harness has its own native
skill folder, copy or symlink `.content-machine/skills/*` there and keep
the generated entrypoints pointed at `node_modules/@45ck/content-machine`.

Reference behavior: Codex
[discovers `AGENTS.md`](https://developers.openai.com/codex/guides/agents-md)
project instructions, while Claude Code
[reads `CLAUDE.md`](https://code.claude.com/docs/en/memory) and can
import another markdown file with `@path` syntax.

## How To Talk To The Agent After Install

Low-attention version:

```text
Use Content Machine from .content-machine. Pick the lane, choose a skill
for one capability or a flow for a multi-step run, write artifacts to
runs/<run-id>, run publish-prep, and tell me pass/fail plus artifact paths.
```

Assume the user already has Claude Code, Codex CLI, Cursor, or another
agent harness. The user should not have to memorize low-level flags; the
harness reads `.content-machine/skills`, `.content-machine/flows`, and
calls `cm-agent` only when it needs deterministic runtime execution.

Ask for outcomes, not low-level flags:

```text
Use Content Machine to make a 35-second TikTok-style explainer about
Redis vs PostgreSQL for caching. Pick the lane, run the default
generate-short flow, and only call it ready if publish-prep passes.
```

```text
Use the reddit-post-over-gameplay lane for this story. Keep gameplay
full-screen, show the Reddit opener card for 3-5 seconds, use bold
captions, and run the review gate.
```

```text
Turn this longform video into three candidate shorts. Select moments
first with the longform-to-shorts flow, snap boundaries, show me the
candidate plan, extract only the approved candidate, then render and
review it.
```

The agent should:

1. Choose the lane first, then choose a skill for one capability or a
   flow for a multi-step run.
2. Read the relevant `SKILL.md` and optional flow.
3. Run the packaged runner only for executable stages.
4. Preserve script, audio, timestamps, visuals, captions, render
   metadata, asset ledger, and publish-prep outputs.
5. Report what passed, what failed, and where the artifacts are.

## Runtime Commands Agents Can Use

List tools:

```bash
npx --no-install cm-agent list
```

List materialized skills:

```bash
cat <<'JSON' | npx --no-install cm-agent skill-catalog
{
  "skillsDir": ".content-machine/skills",
  "includeExamples": true
}
JSON
```

Run diagnostics before real generation:

```bash
cat <<'JSON' | npx --no-install cm-agent doctor-report
{
  "strict": false
}
JSON
```

Run a flow from the installed pack:

```bash
cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": ".content-machine/flows",
  "flow": "generate-short",
  "runId": "demo-run",
  "input": {
    "topic": "Redis vs PostgreSQL for caching",
    "publishPrep": { "enabled": true, "platform": "tiktok" }
  }
}
JSON
```

Run the longform candidate-planning flow from the installed pack:

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

Extract approved longform clips after approval:

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

## Repo Checkout Mode

If you are contributing to Content Machine itself, use the repo-local
surfaces instead:

```bash
git clone https://github.com/45ck/content-machine.git
cd content-machine
npm install
printf '{}\n' | npm run agent:skill-catalog
```

From a checkout, skills live in `skills/`, flows live in `flows/`, and
runtime entrypoints live in `scripts/harness/`.
