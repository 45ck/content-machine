# Codex Self-Test

This workspace is used to validate the repo against the local `codex`
CLI.

The goal is to verify that a Codex session can:

- discover the repo-local skills,
- follow the harness-first docs,
- run a small subset of deterministic harness entrypoints,
- write its findings back into this experiment folder.

Artifacts for a run should stay under this directory.
