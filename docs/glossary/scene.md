# scene

A **scene** is the primary script unit with spoken text and visual direction.

## Data layer meaning

- Scenes originate in `script.json` and flow through subsequent artifacts via scene identity.

## Where it appears

- `script.json`: `ScriptOutputSchema.scenes[]` items (schema name: `SceneSchema`)

## Code references

- `src/script/schema.ts` (`SceneSchema`, `ScriptOutputSchema`)
- `src/script/prompts/index.ts` (prompt-level scene rules)

## Related

- `docs/glossary/scene-id.md`
