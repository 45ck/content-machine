# Risk and Security: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (local-first hardening)

## 1) Threat model

The Lab runs locally and serves a UI + API. The primary risks are:

- Accidental exposure: binding to 0.0.0.0 instead of 127.0.0.1
- Arbitrary file read: path traversal or unrestricted artifact serving
- Arbitrary command execution: runner misused, workflow exec hooks, shell injection
- Secret leakage: exporting env vars or writing API keys into provenance
- Large file denial: reading huge videos into memory, no streaming
- Browser-origin confusion: other sites reaching the Lab server (CSRF-like local attacks)

## 2) Security requirements (MVP)

Network:

- Bind to 127.0.0.1 by default; require explicit flag for external bind.
- Do not enable permissive CORS. Prefer same-origin requests only (omit CORS headers unless needed).

Filesystem:

- Never serve arbitrary paths from the client.
- Register runs (runId -> root dir) via import and only serve from those roots.
- Serve only a strict allowlist of artifact filenames.
- Enforce allowed roots (configurable): reject importing directories outside allowlist.
- Resolve and validate paths using `realpath` semantics to prevent symlink escapes.

Runner:

- Disabled by default.
- When enabled:
  - Use `spawn` with argv array (no shell).
  - Do not execute workflows exec hooks unless explicitly allowed.
  - Default `runner-allow-network=false` to avoid surprise costs.
  - Capture logs for debugging; redact secrets.

Secrets:

- Never store env values in provenance. Store only an allowlisted set of keys (names only).
- Exports must not include `.env` content or API keys.
- Export endpoints must restrict the output path to a safe directory to avoid arbitrary file writes.

Streaming:

- Implement HTTP Range streaming for videos.
- Avoid loading full MP4 into memory.

## 3) Failure modes and mitigations

### Risk: path traversal

Mitigation:

- Validate all requested artifacts resolve under the registered run root.
- Refuse `..` segments and normalize via `path.resolve`.

### Risk: local CSRF / drive-by access

Mitigation:

- Require a session token header for API mutations (POST endpoints).
- Token is generated per Lab session and embedded in served UI (not stored in URL query string).

### Risk: command injection

Mitigation:

- No shell spawns. All execution uses `spawn(cmd, argv)`.
- Runner spec is validated and normalized; disallow arbitrary command binaries unless allowlisted.

### Risk: workflow exec hooks

Mitigation:

- Default `--runner-allow-workflow-exec=false`.
- In UI, show a scary warning + explicit confirmation if enabling.

### Risk: accidental network costs

Mitigation:

- Default runner disallows network; UI shows "network disabled" badge.
- Enabling network requires explicit CLI flag at lab start.

## 4) Audit checklist (ship gate)

- [ ] Server binds to 127.0.0.1 by default
- [ ] CORS restricted to same origin
- [ ] POST endpoints require a session token
- [ ] Only registered run roots are readable
- [ ] Artifact allowlist enforced
- [ ] Video streaming uses Range support
- [ ] Runner uses spawn without shell
- [ ] No secrets written to store/export
