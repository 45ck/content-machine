# Harness Scripts

These entrypoints are the deterministic subprocess surface for coding
harnesses such as Claude Code and Codex CLI.

Role split:

- `skills/` defines when to use something and what it should produce
- `flows/` defines how multiple skills are orchestrated
- `scripts/harness/` executes the work over JSON stdin/stdout

Each script reads JSON from stdin and writes a single JSON response to
stdout. The reusable logic lives under `src/harness/`; these files are
thin launchers so the harness can run them with Node's `tsx` loader:

```bash
node --import tsx scripts/harness/ingest.ts < request.json
```

When to use which entrypoint:

- Use `run-flow.ts` when the request is multi-step and run-scoped.
- Use `flow-catalog.ts` when the harness needs to discover available
  flows.
- Use `skill-catalog.ts` when the harness needs to discover available
  skills.
- Use a direct stage entrypoint such as `brief-to-script.ts` or
  `video-render.ts` when the harness already knows the exact capability
  it wants.

Most flows write under `runs/<run-id>/`. Direct skills may instead write
to explicit output paths provided in the request.

Current entrypoints:

- `doctor-report.ts`
- `flow-catalog.ts`
- `run-flow.ts`
- `skill-catalog.ts`
- `generate-short.ts`
- `brief-to-script.ts`
- `ingest.ts`
- `script-to-audio.ts`
- `timestamps-to-visuals.ts`
- `video-render.ts`
- `publish-prep.ts`

See `skills/*/SKILL.md` for skill contracts and `flows/*` for flow
contracts.
