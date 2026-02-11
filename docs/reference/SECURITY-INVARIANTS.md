# Security Invariants

> DO NOT EDIT: generated from `docs/reference/repo-facts.yaml`.

Invariants:

- Never print or log secret values.
- Only refer to secrets by env var name (example: OPENAI_API_KEY).
- Do not commit real API keys or tokens to git.
- Prefer least-privilege GitHub Actions permissions.
