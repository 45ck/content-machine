# Agent Runtime Scripts

These entrypoints are the optional repo-side execution surface for the
checkout when you are working from Claude Code, Codex CLI, and similar
coding-agent CLIs.

Role split:

- `skills/` defines how to do something well and what it should produce
- `flows/` defines how `45ck/prompt-language` orchestrates multiple skills
- `scripts/harness/` executes the work over JSON stdin/stdout

Each script reads JSON from stdin and writes a single JSON response to
stdout. The reusable logic lives under `src/harness/`; these files are
thin launchers so the repo can run them with Node's `tsx` loader when
an agent wants the package to execute a step directly:

```bash
node --import tsx scripts/harness/ingest.ts < request.json
```

Installed-package users should prefer `npx --no-install cm-agent <tool>`.
Do not use repo-local `node --import tsx scripts/harness/*.ts` commands
unless you are working inside the Content Machine checkout.

## Entrypoint Groups

| Group              | Entrypoints                                                                               | Use                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Discovery          | `skill-catalog.ts`, `flow-catalog.ts`, `doctor-report.ts`                                 | Inspect available skills, flows, and environment readiness          |
| Full flows         | `run-flow.ts`, `generate-short.ts`, `reverse-engineer-winner.ts`                          | Run multi-step or run-scoped work                                   |
| Stage runners      | `brief-to-script.ts`, `script-to-audio.ts`, `timestamps-to-visuals.ts`, `video-render.ts` | Execute a known stage directly                                      |
| Review/provenance  | `asset-ledger.ts`, `caption-export.ts`, `publish-prep.ts`, `publish-prep-review.ts`       | Validate outputs and preserve rights/review evidence                |
| Source and library | `ingest.ts`, `source-media-analyze.ts`, `media-index.ts`, `style-profile-library.ts`      | Prepare or catalog reusable inputs                                  |
| Longform selection | `longform-highlight-select.ts`, `highlight-approval.ts`, `boundary-snap.ts`               | Pick, approve, and clean clip boundaries before render              |
| Story assets       | `reddit-story-assets.ts`                                                                  | Generate reusable Reddit/story visual assets                        |
| Install/package    | `install-skill-pack.ts`                                                                   | Materialize `.content-machine/` into another agent-aware repository |

Most `45ck/prompt-language` flows write under `runs/<run-id>/`. Direct
skills may instead write to explicit output paths provided in the
request.

Fallback when npm bins are unavailable:
`node ./node_modules/@45ck/content-machine/agent/run-tool.mjs <tool>`.

When using a materialized pack in another project, pass the installed
directories explicitly:

```bash
cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": ".content-machine/flows",
  "flow": "generate-short",
  "runId": "demo-run",
  "input": { "topic": "Example short" }
}
JSON
```

See `skills/*/SKILL.md` for skill guides and `flows/*` for flow guides.
