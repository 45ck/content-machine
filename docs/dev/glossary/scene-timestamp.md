# scene-timestamp

A **scene timestamp** groups word timestamps for a single scene, with scene-level audio boundaries.

## Where it appears

- `timestamps.json`: `TimestampsOutputSchema.scenes[]` items (schema name: `SceneTimestampSchema`)

## Fields (current)

- `sceneId`: which scene these words belong to
- `audioStart` / `audioEnd`: scene boundaries in seconds
- `words`: ordered `WordTimestamp` list

## Code references

- `src/audio/schema.ts` (`SceneTimestampSchema`)

## Related

- `docs/dev/glossary/word-timestamp.md`
- `docs/dev/glossary/scene-id.md`
