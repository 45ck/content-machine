# schema-version

`schemaVersion` is a version string embedded in JSON artifacts to support stable contracts and migrations.

## Data layer meaning

- Every JSON artifact includes `schemaVersion`.
- Breaking changes require bumping the schema version and (when feasible) a migration path.

## Where it appears

- `script.json`: `ScriptOutputSchema.schemaVersion` (defaulted)
- `timestamps.json`: `TimestampsOutputSchema.schemaVersion` (defaulted)
- `visuals.json`: `VisualsOutputSchema.schemaVersion` (defaulted)

## Code references

- `src/script/schema.ts` (`SCRIPT_SCHEMA_VERSION`, `ScriptOutputSchema`)
- `src/audio/schema.ts` (`AUDIO_SCHEMA_VERSION`, `TimestampsOutputSchema`)
- `src/visuals/schema.ts` (`VISUALS_SCHEMA_VERSION`, `VisualsOutputSchema`)

## Related

- `docs/glossary/artifact.md`
