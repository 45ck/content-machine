# Repository Facts

> DO NOT EDIT: generated from `registry/repo-facts.yaml`.

See also (generated):

- `docs/reference/ARTIFACT-CONTRACTS.md`
- `docs/reference/CONFIG-SURFACE.md`
- `docs/reference/QUALITY-GATES.md`
- `docs/reference/SECURITY-INVARIANTS.md`
- `docs/reference/CLI-CONTRACT.md`
- `docs/reference/PIPELINE-PRESETS.md`

## Runtime

- Node: >=20
- Package manager: npm
- Primary language: TypeScript

## LLM Providers

- OpenAI (id: `openai`)
  - Env vars: `OPENAI_API_KEY`. Preferred for structured outputs.
- Anthropic (id: `anthropic`)
  - Env vars: `ANTHROPIC_API_KEY`
- Google Gemini (id: `gemini`)
  - Env vars: `GOOGLE_API_KEY`, `GEMINI_API_KEY`. Google key alias supported; prefer GOOGLE_API_KEY.

Default:

- provider: `openai`
- model: `gpt-4o-mini`
- temperature: `0.7`

## Stock Visuals Providers

- Pexels (id: `pexels`)
  - Env vars: `PEXELS_API_KEY`. Stock video provider (implemented).
- Pixabay (id: `pixabay`)
  - Env vars: `PIXABAY_API_KEY`. Planned (not implemented yet).

## Visuals Providers

- Pexels (id: `pexels`)
  - Env vars: `PEXELS_API_KEY`. Stock video provider (implemented).
- NanoBanana (Gemini Images) (id: `nanobanana`)
  - Env vars: `GOOGLE_API_KEY`, `GEMINI_API_KEY`. AI image provider (implemented); GOOGLE_API_KEY preferred.
- Local Clips (id: `local`)
  - Notes: Use local clips/images; no API key required.
- Local Images (id: `localimage`)
  - Notes: Use local images; no API key required.
- Pixabay (id: `pixabay`)
  - Env vars: `PIXABAY_API_KEY`. Planned (not implemented yet).
- Default visuals provider: `pexels`
- Default motion strategy: `kenburns`

## Spellcheck

- CSpell config: `cspell.json`

Generated dictionaries:

- `ubiquitous-language` -> `config/cspell/ubiquitous-language.txt`
- `repo-facts` -> `config/cspell/repo-facts.txt`

Manual dictionaries:

- `project-words` -> `config/cspell/project-words.txt`
