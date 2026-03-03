# Configuration

Canonical config locations and precedence are generated here:

- [`docs/reference/CONFIG-SURFACE.md`](../reference/CONFIG-SURFACE.md)

Canonical environment variable names are generated here:

- [`docs/reference/ENVIRONMENT-VARIABLES.md`](../reference/ENVIRONMENT-VARIABLES.md)

## Minimal Setup

`.env` (secrets, never commit):

```bash
OPENAI_API_KEY=sk-...
PEXELS_API_KEY=...
```

`.content-machine.toml` (project defaults):

```toml
[defaults]
archetype = "listicle"
orientation = "portrait"
voice = "af_heart"
```

## Data-Driven Resources

These are intentionally data-defined (no code changes required):

- Script archetypes: `assets/archetypes/`, `./.cm/archetypes/`, `~/.cm/archetypes/`
- Render templates: `assets/dev/templates/`, `./.cm/dev/templates/`, `~/.cm/dev/templates/`
- Pipeline workflows: `./.cm/workflows/`, `~/.cm/workflows/`

Canonical terminology (generated): [`docs/reference/GLOSSARY.md`](../reference/GLOSSARY.md)
