# guide-cli-tdd-vv-execution-20260107

This is the step-by-step execution plan to implement the CLI UX roadmap using TDD and the V&V framework.

## Scope (deliverables)

1. stdout/stderr contract across all commands
2. JSON envelope contract across all commands
3. preflight validation (files + schemas + enums)
4. structured progress events (remove substring parsing)
5. artifact semantics (`--keep-artifacts` truly keeps intermediates)
6. optional LLM streaming status phases (connect/stream/validate/retry)

## TDD workflow (non-negotiable)

For each deliverable:

1. RED: write failing tests defining the contract
2. GREEN: minimal code changes to pass
3. REFACTOR: dedupe shared helpers, align docs, keep tests green

## V&V workflow (4 layers)

### Layer 1: Schema validation

- Input schemas validated at CLI boundaries
- JSON envelope validated by tests

### Layer 2: Programmatic checks

- stdout purity
- exit codes
- no side effects in `--dry-run`
- artifact existence + paths

### Layer 3: LLM-as-judge (optional)

- error messages and status updates scored against rubric (clarity + fixability)

### Layer 4: Human review

- run interactive scripts on Windows and macOS terminals

## Test plan (what to add)

### Integration tests (spawn CLI)

For each command:

- `--json` emits exactly one JSON object to stdout
- invalid args produce exit code 2 and include `Fix:` in `errors[0].context.fix`

### Smoke tests

- `cm generate --mock --keep-artifacts` produces all intermediates + final output
- `cm generate --json --dry-run` prints one JSON object and exits 0

## Implementation order

1. Fix stdout pollution in `--json` mode (logging/spinners)
2. Standardize error + fix line propagation
3. Add preflight schema validation for stage inputs
4. Implement structured pipeline events + update `cm generate` to use them
5. Implement `--keep-artifacts` to actually write intermediates
6. Add optional LLM status phases (connect/stream/validate)

## Definition of Done

- Every command meets the stdout/stderr contract
- Every command supports `--json` envelope reliably
- Progress is structural (not substring parsing) for pipeline stages
- `--keep-artifacts` does what it says
- Tests cover the contracts and are green
