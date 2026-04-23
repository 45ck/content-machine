# Harness-First Validation

## Available repo-local skills

`skill-catalog` discovered 9 shipped skills from the parent repo `skills/` directory:

- `brief-to-script`
- `doctor-report`
- `generate-short`
- `publish-prep-review`
- `reverse-engineer-winner`
- `script-to-audio`
- `skill-catalog`
- `timestamps-to-visuals`
- `video-render`

These match the starter skills listed in `../../AGENTS.md` and `../../skills/README.md`.

## What I ran

From `experiments/codex-selftest/`:

```bash
mkdir -p output/harness
printf '%s\n' '{"skillsDir":"skills","includeExamples":true}' \
  | node --import tsx ../../scripts/harness/skill-catalog.ts \
  > output/harness/skill-catalog.json
printf '%s\n' '{"strict":false,"outputPath":"output/harness/doctor/doctor.json"}' \
  | node --import tsx ../../scripts/harness/doctor-report.ts \
  > output/harness/doctor-report.json
```

Artifacts written under this experiment:

- `output/harness/skill-catalog.json`
- `output/harness/doctor-report.json`
- `output/harness/doctor/doctor.json`

## Result

The harness-first surface worked for this minimal validation:

- `skill-catalog.ts` ran successfully from the nested experiment directory and resolved the parent repo `skills/` directory.
- `doctor-report.ts` ran successfully and wrote its report artifact under this experiment folder.

## Breakages / mismatches

- No harness entrypoint breakage was observed in this pass.
- `doctor-report` returned an unhealthy environment: `ok: false`, `2` failures, `3` warnings.
- Reported issues were missing Whisper assets, missing `OPENAI_API_KEY`, missing `PEXELS_API_KEY`, and Node `18.20.5` being below the repo recommendation `>= 20.6.0`.
- The doctor fix text still points to legacy `cm setup whisper ...` commands, which is slightly out of step with the repo’s harness-first direction.
