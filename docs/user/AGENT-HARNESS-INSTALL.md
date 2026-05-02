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
1. Run `npm install @45ck/content-machine`.
2. Run the packaged install tool to materialize `.content-machine/`.
3. Read `.content-machine/README.md` and `.content-machine/AGENTS.md`.
4. Verify the runner with `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs list`.
5. Run doctor-report and tell me what is missing before generating real videos.

After install, when I ask for a short, choose the right Content Machine
skill or flow first, write artifacts under `runs/<run-id>/`, and only
call an MP4 ready when publish-prep passes.
```

If you want the exact command form:

```bash
npm install @45ck/content-machine

cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs install-skill-pack
{
  "targetDir": ".content-machine",
  "includeFlows": true,
  "includeExamples": true,
  "overwrite": false
}
JSON
```

Use `"overwrite": true` when intentionally refreshing an existing
`.content-machine/` pack after upgrading the npm package.

## What Gets Installed

| Path                         | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `.content-machine/README.md` | Human and agent orientation for the materialized pack                     |
| `.content-machine/AGENTS.md` | Agent-facing operating rules that can be copied into root instructions    |
| `.content-machine/skills/`   | `SKILL.md` files that explain when and how to use each capability         |
| `.content-machine/flows/`    | Optional `.flow` manifests for multi-step jobs                            |
| `node_modules/@45ck/...`     | Runtime implementation and `agent/run-tool.mjs` JSON-stdio command bridge |

The copied skill docs are rewritten to call the installed package
runner, so agents do not need the source repo checkout.

## Harness Matrix

| Harness                 | Install Pattern                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Codex CLI               | Ask Codex to run the copy-paste prompt, then point it at `.content-machine/skills/` and `.content-machine/AGENTS.md`. |
| Claude Code             | Ask Claude to run the copy-paste prompt, then let it read `.content-machine/README.md`; copy AGENTS rules if needed.  |
| Cursor or editor agents | Run the command in the project terminal, then mention `.content-machine/skills/` in the chat or project instructions. |
| Generic shell agent     | Give it the command block and tell it to use `agent/run-tool.mjs <tool>` for JSON-stdio runtime calls.                |

Content Machine does not require a special native plugin registry. The
portable install works because most coding agents can read repo-local
Markdown and run local commands. If your harness has its own native
skill folder, copy or symlink `.content-machine/skills/*` there and keep
the generated entrypoints pointed at `node_modules/@45ck/content-machine`.

## How To Talk To The Agent After Install

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
first, snap boundaries, then render only the approved candidate.
```

The agent should:

1. Choose an archetype or skill.
2. Read the relevant `SKILL.md` and optional flow.
3. Run the packaged runner only for executable stages.
4. Preserve script, audio, timestamps, visuals, captions, render
   metadata, asset ledger, and publish-prep outputs.
5. Report what passed, what failed, and where the artifacts are.

## Runtime Commands Agents Can Use

List tools:

```bash
node ./node_modules/@45ck/content-machine/agent/run-tool.mjs list
```

List materialized skills:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs skill-catalog
{
  "skillsDir": ".content-machine/skills",
  "includeExamples": true
}
JSON
```

Run a flow from the installed pack:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs run-flow
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

Run diagnostics:

```bash
cat <<'JSON' | node ./node_modules/@45ck/content-machine/agent/run-tool.mjs doctor-report
{
  "strict": false
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
