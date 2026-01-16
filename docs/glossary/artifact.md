# artifact

An **artifact** is a file written to disk by a pipeline stage and treated as the stable contract between stages.

## Data layer meaning

- Artifacts are the boundary between stages (script → audio → visuals → render).
- Artifacts are validated via Zod schemas when they are JSON.

## Canonical examples

- `script.json` (script stage output)
- `timestamps.json` (audio stage output)
- `visuals.json` (visuals stage output)
- `audio.wav` (audio stage output)
- `video.mp4` (render stage output)

## Code references

- `docs/guides/guide-ubiquitous-language-20260110.md` (Pipeline and artifacts)
- `src/script/schema.ts` (`ScriptOutputSchema`)
- `src/audio/schema.ts` (`TimestampsOutputSchema`)
- `src/visuals/schema.ts` (`VisualsOutputSchema`)

## Related

- `docs/glossary/stage.md`
- `docs/glossary/schema-version.md`
