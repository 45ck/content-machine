# Harness Scripts

These entrypoints are the deterministic subprocess surface for coding
harnesses such as Claude Code and Codex CLI.

Each script reads JSON from stdin and writes a single JSON response to
stdout. The reusable logic lives under `src/harness/`; these files are
thin launchers so the harness can run them with `tsx`:

```bash
npx tsx scripts/harness/ingest.ts < request.json
```

Current entrypoints:

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

See `skills/*/SKILL.md` for the intended harness-facing contract.
