# scene-id

A **scene id** is the identifier that links a scene across artifacts.

## Current implementation

- In `script.json`, the scene id field is `SceneSchema.id`.
- In downstream artifacts, the same concept is carried as `sceneId`.

## Field mapping

- `ScriptOutputSchema.scenes[].id` → `SceneTimestampSchema.sceneId`
- `ScriptOutputSchema.scenes[].id` → `VisualAssetSchema.sceneId`

## Stability rules

1. Once written to `script.json`, scene ids must not be regenerated in later stages.
2. Downstream artifacts should only reference scene ids that exist in `script.json`.

## Code references

- `src/script/schema.ts` (`SceneSchema.id`)
- `src/script/generator.ts` (`buildScriptOutput` assigns `scene-###`)
- `src/audio/schema.ts` (`SceneTimestampSchema.sceneId`)
- `src/visuals/schema.ts` (`VisualAssetSchema.sceneId`)

## Related

- `docs/glossary/scene.md`
