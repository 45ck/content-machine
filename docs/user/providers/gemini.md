# Google Gemini

This repo supports Google Gemini for:

- **LLM provider** (script, research helpers, keyword extraction): `llm.provider = "gemini"`
- **AI image generation** (visuals): `visuals.provider = "nanobanana"`
- **Optional image-to-video synthesis** (media stage): `motionStrategy = "veo"` via the harness flow/runtime path

## Setup

In `.env` (or your shell environment), set one of:

```bash
export GOOGLE_API_KEY="..."
# or
export GEMINI_API_KEY="..."
```

Canonical env var names: `docs/reference/ENVIRONMENT-VARIABLES.md`.

## Use Gemini As The LLM Provider

In `.content-machine.toml`:

```toml
[llm]
provider = "gemini"
model = "gemini-2.0-flash"
```

Then run:

```bash
cat <<'JSON' | node --import tsx scripts/harness/brief-to-script.ts
{
  "topic": "Redis vs PostgreSQL for caching",
  "archetype": "versus"
}
JSON
```

Or end-to-end:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "generate-short",
  "runId": "gemini-demo",
  "input": {
    "topic": "Redis vs PostgreSQL for caching",
    "visuals": { "provider": "nanobanana", "orientation": "portrait" }
  }
}
JSON
```

## Notes

- Gemini chat does not have a first-class `system` role; this repo prepends `system` content to the first `user` message.
- JSON mode uses Gemini `responseMimeType = "application/json"`; always validate outputs against schemas.
