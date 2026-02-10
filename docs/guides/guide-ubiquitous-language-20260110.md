# guide-ubiquitous-language-20260110

Apply the repo's canonical vocabulary consistently across docs, code, CLI help text, and errors.

## When to use this

- Writing or editing docs, CLI help text, schemas, or user-facing logs
- Naming new pipeline stages, artifacts, or config keys
- Reviewing terminology for consistency across features

## Prerequisites

- `AGENTS.md`
- `docs/architecture/SYSTEM-DESIGN-20260104.md`

## Steps

1. Use the canonical definitions from `docs/reference/ubiquitous-language.yaml` (source of truth).
2. Confirm the generated glossary (`docs/reference/GLOSSARY.md`) matches what you're writing.
3. Use stage and artifact names exactly as listed in "Pipeline and artifacts".
4. Avoid deprecated or ambiguous terms listed in "Terms to avoid".
5. Apply "Documentation structure rules" to every new or edited doc.

## Canonical glossary system

Canonical sources:

- Registry (edit this): `docs/reference/ubiquitous-language.yaml`
- Glossary (generated): `docs/reference/GLOSSARY.md`
- System explainer: `docs/reference/ubiquitous-language-system-20260210.md`

Commands:

```bash
npm run glossary:gen
npm run glossary:check
```

## Ubiquitous language (domain)

### Product and pipeline

- **Content Machine**: the product name in prose.
- **content-machine**: the repository or package name.
- **cm**: the CLI command prefix.
- **pipeline**: the ordered stages that transform a topic into a video.
- **stage**: one logical step in the pipeline (script, audio, visuals, render).
- **command**: a CLI entry that executes a stage (`cm script`, `cm audio`, ...).
- **generate**: the orchestrated pipeline command (`cm generate`).

### Script and narrative

- **topic**: the user-provided input prompt.
- **archetype**: a content structure (listicle, versus, howto, myth, story, hot-take).
- **scene**: the primary script unit with spoken text and visual direction.
- **hook**: the opening line(s) that capture attention.
- **cta**: call-to-action at the end of the script.

### Audio and captions

- **audio**: the rendered voiceover file (`audio.wav`).
- **timestamps**: word-level timing data (`timestamps.json`).
- **word timestamp**: a word with `start` and `end` times in seconds.
- **caption**: on-screen text derived from timestamps, often with word highlight.

### Visuals and assets

- **visuals**: the per-scene visual plan (`visuals.json`).
- **visual asset**: the chosen video or image for a scene.
- **stock footage**: third-party assets (Pexels, Pixabay).
- **user footage**: assets provided by the user.

### Render and output

- **render**: the Remotion-based video generation stage.
- **composition**: a Remotion composition id.
- **template**: a data-driven set of defaults that selects a composition and styles.
- **video**: the final MP4 output (`video.mp4`).

## Pipeline and artifacts

| Stage   | Command      | Primary input                                    | Primary output                 |
| ------- | ------------ | ------------------------------------------------ | ------------------------------ |
| script  | `cm script`  | topic string                                     | `script.json`                  |
| audio   | `cm audio`   | `script.json`                                    | `audio.wav`, `timestamps.json` |
| visuals | `cm visuals` | `timestamps.json`                                | `visuals.json`                 |
| render  | `cm render`  | `visuals.json` + `audio.wav` + `timestamps.json` | `video.mp4`                    |

`cm generate` runs the full pipeline in order using the same artifact names.

## Software perspective (implementation)

### Providers and engines

- **provider**: external service integration (OpenAI, Anthropic, Pexels).
- **engine**: local runtime or library (kokoro, whisper-cpp, Remotion).
- **adapter**: code wrapper around a provider or engine.

### Schemas and data

- **schema**: a Zod contract for inputs and outputs.
- **schemaVersion**: version string used for data migrations.
- **artifact**: a file written to disk by a stage.
- **output**: structured JSON or metadata representing results.

### Config and environment

- **config file**: `.content-machine.toml`.
- **env var**: `OPENAI_API_KEY`, `PEXELS_API_KEY`, etc.
- **defaults**: config values used when flags are not set.

### Observability

- **log**: structured event written to stderr or log sink.
- **progress event**: structured stage progress message.
- **error code**: `CMError` code string, stable for automation.

## Abbreviations

- **LLM**: large language model.
- **TTS**: text-to-speech.
- **ASR**: automatic speech recognition.
- **CLI**: command-line interface.
- **API**: application programming interface.
- **JSON**: JavaScript Object Notation.
- **TOML**: Tom's Obvious, Minimal Language.

## Terms to avoid

- **section** -> use **scene** (legacy fields only).
- **segment** -> use **scene** for timestamps (legacy fields only).
- **clip** -> use **visual asset** for the per-scene plan.
- **transcript** -> use **timestamps** for word timing output.

## Documentation structure rules

- Choose the doc type (Tutorial, Guide, Reference, Explanation) and use the template.
- Start with a one-sentence purpose line and list inputs/outputs explicitly.
- Use canonical artifact names and include at least one example command.
- Use `cm` for the CLI and `content-machine` for the repo/package.
- Avoid inventing new synonyms for stages or artifacts.
- Keep units explicit (seconds, Hz, px).
- Add a `Related` section with links to relevant ADRs, features, guides, or tasks.

## Examples

```bash
# Canonical stage naming and artifacts
cm script --topic "Redis vs PostgreSQL" --output output/script.json
cm audio --input output/script.json --output output/audio.wav --timestamps output/timestamps.json
cm visuals --input output/timestamps.json --output output/visuals.json
cm render --input output/visuals.json --audio output/audio.wav --timestamps output/timestamps.json --output output/video.mp4
```

## Troubleshooting

- **Symptom:** Docs or code use different terms for the same concept.
  - **Fix:** Replace with the canonical terms from this guide.

## Related

- `docs/guides/guide-cli-ux-standards-20260106.md`
- `docs/architecture/SYSTEM-DESIGN-20260104.md`
- `docs/reference/cm-generate-reference-20260106.md`
- `docs/reference/GLOSSARY.md`
- `docs/reference/ubiquitous-language.yaml`
