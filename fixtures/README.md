# Fixtures

This directory holds shipped example inputs and small repo-owned fixture
artifacts that do not belong at the top level.

Current layout:

- `examples/` — runnable example packages and templates
- `test-fixtures/` — small legacy fixture files kept for compatibility

Rule:

- keep reusable, repo-owned fixture material here
- keep generated outputs in `output/`, `experiments/*/results/`, or
  other ignored run directories instead of promoting them to the repo
  root
