# Repository instructions (generated)

This repository is `content-machine`.

## Canonical sources of truth

- Repo facts: `registry/repo-facts.yaml`
- Ubiquitous language: `registry/ubiquitous-language.yaml`
- Artifact contracts: `docs/reference/ARTIFACT-CONTRACTS.md`
- Config surface: `docs/reference/CONFIG-SURFACE.md`
- CLI contract: `docs/reference/CLI-CONTRACT.md`

## Build & quality

- Install: `npm ci`
- Quality gates: `npm run quality`
- Tests: `npm run test:run`

## Providers

Supported LLM providers:

- OpenAI (id: `openai`)
  - Env vars: `OPENAI_API_KEY`. Preferred for structured outputs.
- Anthropic (id: `anthropic`)
  - Env vars: `ANTHROPIC_API_KEY`
- Google Gemini (id: `gemini`)
  - Env vars: `GOOGLE_API_KEY`, `GEMINI_API_KEY`. Google key alias supported; prefer GOOGLE_API_KEY.

Default LLM:

- provider: `openai`
- model: `gpt-4o-mini`
