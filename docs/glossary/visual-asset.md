# visual-asset

A **visual asset** is the per-scene selected media (video or image) used during render.

## Where it appears

- `visuals.json`: `VisualsOutputSchema.scenes[]` items (schema name: `VisualAssetSchema`)

## Fields (current highlights)

- `sceneId`: which scene this asset is for
- `source`: where the asset came from (e.g., `stock-pexels`, `user-footage`)
- `assetPath`: local path or URL-like string used by the renderer/importer
- `duration`: planned duration in seconds

## Code references

- `src/visuals/schema.ts` (`VisualAssetSchema`, `VisualsOutputSchema`)
- `docs/dev/guides/guide-ubiquitous-language-20260110.md` (term: visual asset)

## Related

- `docs/glossary/scene-id.md`
