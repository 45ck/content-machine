Use the repo-local skills and harness-first docs from the parent
repository.

Work from the current experiment folder and keep any artifacts you write
under `experiments/codex-selftest/`.

Do this:

1. Inspect the repo-local skills and confirm which ones are available.
2. Run a minimal validation of the harness-first surface by exercising:
   - `scripts/harness/skill-catalog.ts`
   - `scripts/harness/doctor-report.ts`
3. Write a concise markdown report to
   `experiments/codex-selftest/report.md` with:
   - what you ran,
   - whether the skills/harness surface worked,
   - any breakages or mismatches you found.

Constraints:

- Do not modify files outside `experiments/codex-selftest/`.
- Prefer the harness-first path over the legacy CLI.
- Keep the report concise.
