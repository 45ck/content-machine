# Glossary (Ubiquitous Language)

> DO NOT EDIT: generated from `docs/reference/ubiquitous-language.yaml`.

This repo uses a few loaded words. This glossary makes them unambiguous and points to the canonical types/schemas in code.

## Audio Mix Preset

**Term:** AudioMixPreset

**Definition:** A named set of audio mix defaults (music/SFX/ambience levels and LUFS target) used by the audio mix planner. Mix presets are intended to be data-defined and installable via packs; built-ins ship with CM.

**Not:**

- Not a sync preset (sync presets tune timestamp sync behavior).
- Not a caption preset (caption presets control burned-in caption styling).

**Canonical types:**

- `AudioMixPresetId`

**Canonical schemas:**

- `AudioMixPresetIdSchema`

**Where it lives:**

- Built-in defaults: src/audio/mix/presets.ts
- Future pack location (planned): audio/mix-presets/<id>.json

**CLI surface:**

- `cm audio --mix-preset <id>`
- `cm generate --mix-preset <id>`

**Synonyms to avoid:**

- `profile`

**Owner:** `audio`

## Caption Config

**Term:** Captions

**Definition:** The full caption styling and layout contract used by rendering (fonts, safe zones, display mode, highlighting, cleanup, badges).

**Not:**

- Not the raw transcript/timestamps (captions consume timestamps).

**Canonical types:**

- `CaptionConfig`

**Canonical schemas:**

- `CaptionConfigSchema`

**Where it lives:**

- Schema: src/render/captions/config.ts

**CLI surface:**

- `cm render --caption-preset <id> [--caption-* flags]`

**Owner:** `render`

## Caption Preset

**Term:** CaptionPreset

**Definition:** A named, tested baseline `CaptionConfig` (e.g. tiktok/capcut) that can be deep-overridden by config or CLI flags.

**Not:**

- Not a render template.

**Canonical types:**

- `CaptionPresetName`

**Where it lives:**

- Presets: src/render/captions/presets.ts

**CLI surface:**

- `cm render --caption-preset <name>`

**Owner:** `render`

## Code Template

**Term:** CodeTemplate

**Definition:** A template pack that also ships a Remotion project (entrypoint + compositions). When a Render Template includes a `remotion` block, CM will execute that code during bundling/render. This requires explicit opt-in via config/flags.

**Not:**

- Not the same as a Render Template (data-only template.json).

**Canonical schemas:**

- `RemotionTemplateProjectSchema`

**Where it lives:**

- Render template field: template.json -> remotion
- Schema: src/render/templates/schema.ts

**CLI surface:**

- `cm render --allow-template-code`
- `cm generate --allow-template-code`

**Synonyms to avoid:**

- `plugin`
- `code pack`

**Owner:** `render`

## Gameplay Clip

**Term:** GameplayClip

**Definition:** Optional gameplay footage used by split-screen templates as background (e.g. Subway Surfers).

**Not:**

- Not stock b-roll matched per scene (that's visuals scenes).

**Canonical types:**

- `GameplayClip`

**Canonical schemas:**

- `GameplayClipSchema`

**Where it lives:**

- User gameplay dir: ~/.cm/assets/gameplay/<style>/
- Schema: src/visuals/schema.ts

**CLI surface:**

- `cm visuals --gameplay <path> | --gameplay-style <style>`
- `cm render --gameplay <path>`

**Owner:** `visuals`

## Hook Clip

**Term:** Hook

**Definition:** A short intro clip used to stop the scroll in the first ~1-3 seconds. Hooks can be selected from a hook library, a local file, or a URL and are layered before the main content.

**Not:**

- Not the script hook sentence (that's part of the script content).

**Canonical types:**

- `HookClip`
- `HookDefinition`

**Canonical schemas:**

- `HookClipSchema`
- `HookDefinitionSchema`
- `HookAudioModeEnum`
- `HookFitEnum`

**Where it lives:**

- User hooks dir: ~/.cm/assets/hooks
- Schema: src/hooks/schema.ts

**CLI surface:**

- `cm render --hook <idOrPath>`
- `cm generate --hook <idOrPath>`
- `cm hooks list|download|show`

**Owner:** `hooks`

## Motion Strategy

**Term:** MotionStrategy

**Definition:** The technique used to animate static images into moving visuals at render-time (e.g. Ken Burns, parallax). Required for image-based visuals sources.

**Not:**

- Not a template (templates select compositions and defaults).

**Canonical types:**

- `MotionStrategyType`

**Canonical schemas:**

- `MotionStrategyEnum`

**Where it lives:**

- Schema: src/visuals/schema.ts

**CLI surface:**

- `cm visuals --motion-strategy <id>`

**Owner:** `visuals`

## Pack

**Term:** Pack

**Definition:** A distributable bundle (directory or .zip) containing data-defined CM resources (templates, workflows, archetypes, presets, hooks, etc). Packs are installable locally and should be validated by schemas.

**Not:**

- Not a Packaging Artifact (cm package output).
- Not a code plugin by default (data-only unless explicitly opted in).

**Where it lives:**

- Proposed structure: docs/architecture/configuration/CONFIGURATION-SYSTEM-DESIGN-20260207.md

**CLI surface:**

- `cm templates pack|install`
- `cm workflows pack|install`
- `cm archetypes pack|install`

**Synonyms to avoid:**

- `plugin`
- `extension`

**Owner:** `core`

## Packaging Artifact

**Term:** Packaging

**Definition:** A versioned JSON artifact produced by `cm package` containing multiple title/cover/hook variants plus a selected winner. Packaging is used to improve CTR (title/cover) and muted autoplay retention.

**Not:**

- Not a render template or workflow.

**Canonical types:**

- `PackageOutput`
- `PackageVariant`
- `Platform`

**Canonical schemas:**

- `PackageOutputSchema`
- `PackageVariantSchema`
- `PlatformEnum`

**Where it lives:**

- Artifact: packaging.json
- Schema: src/package/schema.ts

**CLI surface:**

- `cm package <topic> -o packaging.json`

**Owner:** `packaging`

## Pipeline Artifact

**Term:** Artifact

**Definition:** An intermediate file produced/consumed by pipeline stages (script.json, audio.wav, timestamps.json, visuals.json, video.mp4). Artifacts are the stable stage contract.

**Not:**

- Not a template/archetype/workflow.

**Where it lives:**

- output/ (by convention) or wherever --output points

**CLI surface:**

- `cm script|audio|visuals|render|generate`

**Owner:** `core`

## Pipeline Stage

**Term:** Stage

**Definition:** One step in the pipeline: script, audio, visuals, render. Stages can be run individually or composed via cm generate.

**Not:**

- Not a workflow (workflows orchestrate stages).

**Where it lives:**

- src/cli/commands/{script,audio,visuals,render,generate}.ts

**CLI surface:**

- `cm script|audio|visuals|render|generate`

**Owner:** `pipeline`

## Pipeline Workflow

**Term:** Workflow

**Definition:** A pipeline orchestration preset for cm generate. Workflows can select stage modes (builtin vs external/import), provide default inputs, and provide workflow defaults. Workflows may contain exec hooks, which require explicit opt-in.

**Not:**

- Not a render template.
- Not a script format.

**Canonical types:**

- `WorkflowId`
- `WorkflowDefinition`

**Canonical schemas:**

- `WorkflowIdSchema`
- `WorkflowDefinitionSchema`

**Where it lives:**

- Project workflows: ./.cm/workflows/<id>/workflow.json
- User installs: ~/.cm/workflows/<id>/workflow.json

**CLI surface:**

- `cm generate --workflow <idOrPath> [--workflow-allow-exec]`
- `cm workflows list|show|validate|new|pack|install`

**Synonyms to avoid:**

- `recipe`

**Owner:** `pipeline`

## Preset

**Term:** Preset

**Definition:** A named set of default values for a specific subsystem (e.g. captions, sync, audio mix). Presets tune one subsystem; they do not change pipeline orchestration.

**Not:**

- Not a Render Template (templates select compositions and render defaults).
- Not a Pipeline Workflow (workflows orchestrate stages).

**Where it lives:**

- Varies by subsystem (captions, sync, audio, etc)

**CLI surface:**

- `cm generate --sync-preset ...`
- `cm audio --mix-preset ...`

**Owner:** `core`

## Prompt Template

**Term:** PromptTemplate

**Definition:** A reusable text prompt (with variables) used to generate or transform artifacts inside CM (scripts, visuals, metadata, etc). Prompt templates are NOT render templates.

**Not:**

- Not a Render Template (template.json + composition selection).
- Not a Script Archetype (archetypes define script structure/pacing).

**Canonical types:**

- `PromptTemplate`
- `RenderedPrompt`

**Where it lives:**

- Prompt library: src/prompts/templates/\*\*
- Types: src/prompts/types.ts

**Synonyms to avoid:**

- `render template`

**Owner:** `prompts`

## Provider

**Term:** Provider

**Definition:** An external system/integration used by a stage (LLM providers, stock visuals providers, image generation providers).

**Not:**

- Not a preset or a template.

**Canonical types:**

- `VisualsProviderId`

**Canonical schemas:**

- `VisualsProviderIdSchema`

**Where it lives:**

- src/core/llm/\*
- src/visuals/providers/\*

**CLI surface:**

- `cm visuals --provider <id>`

**Owner:** `core`

## Remotion Composition

**Term:** Composition

**Definition:** A Remotion composition id that defines the video layout and timeline behavior (React component + animations). Selected by Render Templates via `compositionId`.

**Not:**

- Not a render template (templates select compositions and defaults).

**Canonical types:**

- `CompositionId`

**Canonical schemas:**

- `CompositionIdSchema`

**Where it lives:**

- Template field: template.json -> compositionId
- Built-in compositions: src/render/remotion/\*

**CLI surface:**

- `cm render --template <idOrPath> (indirectly)`

**Owner:** `render`

## Render Template

**Term:** Template

**Definition:** A render preset that selects a Remotion composition and provides render defaults (orientation/fps/caption preset/config, split-screen params, required slots).

**Not:**

- Not a script format (archetypes do that).
- Not pipeline orchestration (workflows do that).

**Canonical types:**

- `TemplateId`
- `RenderTemplate`

**Canonical schemas:**

- `TemplateIdSchema`
- `RenderTemplateSchema`

**Where it lives:**

- Built-in examples: assets/templates/<id>/template.json
- Project templates: ./.cm/templates/<id>/template.json
- User installs: ~/.cm/templates/<id>/template.json

**CLI surface:**

- `cm render --template <idOrPath>`
- `cm generate --template <idOrPath>`
- `cm templates list|show|validate|new|pack|install`

**Synonyms to avoid:**

- `layout`
- `theme`

**Owner:** `render`

## Script Archetype

**Term:** Archetype

**Definition:** A script format (hook + structure + pacing rules) used by the script stage. Archetypes guide the LLM to produce a particular style of script (listicle, tutorial, story, etc).

**Not:**

- Not a Remotion composition or render layout.
- Not a pipeline orchestration preset.

**Canonical types:**

- `ArchetypeId`
- `ArchetypeSpec`

**Canonical schemas:**

- `ArchetypeIdSchema`
- `ArchetypeSpecSchema`

**Where it lives:**

- Built-in examples: assets/archetypes/\*.yaml (and assets/archetypes/baseline.md)
- Project overrides: ./.cm/archetypes/
- User installs: ~/.cm/archetypes/

**CLI surface:**

- `cm script --archetype <idOrPath>`
- `cm generate --archetype <idOrPath>`
- `cm archetypes list|show|validate|new|pack|install`

**Synonyms to avoid:**

- `format`
- `script template`

**Owner:** `script`

## SFX Pack

**Term:** SfxPack

**Definition:** A named bundle of short sound effects used by the audio mix planner (pops/whooshes/clicks/etc). Packs are intended to be installable and data-only by default.

**Not:**

- Not a single SFX file path passed via --sfx.

**Canonical types:**

- `SfxPackId`

**Canonical schemas:**

- `SfxPackIdSchema`

**Where it lives:**

- Built-in defaults: src/audio/mix/presets.ts
- Future pack location (planned): audio/sfx/<pack-id>/manifest.json + audio files

**CLI surface:**

- `cm audio --sfx-pack <id>`
- `cm generate --sfx-pack <id>`

**Owner:** `audio`

## SFX Placement

**Term:** SfxPlacement

**Definition:** A scheduling rule for when SFX events are placed relative to the script timeline (hook/scene/list-item/cta).

**Not:**

- Not a sync strategy.

**Canonical types:**

- `SfxPlacement`

**Canonical schemas:**

- `SfxPlacementEnum`

**Where it lives:**

- CLI flags: --sfx-at
- Schema: src/audio/mix/presets.ts

**CLI surface:**

- `cm audio --sfx-at <hook|scene|list-item|cta>`
- `cm generate --sfx-at <hook|scene|list-item|cta>`

**Owner:** `audio`

## Style Resolver

**Term:** StyleResolver

**Definition:** The function that resolves Theme references into concrete, render-ready style values (colors, typography, animation, safe zones).

**Not:**

- Not a template resolver (templates resolve template.json).

**Canonical types:**

- `StyleResolverDeps`
- `ResolvedStyle`
- `StyleOverrides`

**Where it lives:**

- Resolver: src/render/styles/resolver.ts
- Types: src/render/styles/types.ts

**Owner:** `render`

## Sync Preset

**Term:** SyncPreset

**Definition:** A named quality/speed tradeoff preset for timestamp sync in `cm generate` (fast/standard/quality/maximum). Sync presets set pipeline mode (standard vs audio-first) and related sync-quality options.

**Not:**

- Not a caption preset (caption presets affect burned-in caption styling).
- Not a workflow (workflows orchestrate stages broadly; sync presets only tune sync behavior).

**Canonical types:**

- `SyncPresetConfig`

**Where it lives:**

- CLI implementation: src/cli/commands/generate.ts

**CLI surface:**

- `cm generate --sync-preset <fast|standard|quality|maximum>`

**Owner:** `sync`

## Template Pack

**Term:** TemplatePack

**Definition:** A distributable bundle (directory or .zip) that installs a Render Template into `~/.cm/templates/<id>/...` (template.json + optional local assets).

**Not:**

- Not a render template itself (the render template is template.json).
- Not a workflow pack (workflows install into ~/.cm/workflows).

**Where it lives:**

- Packed from: any directory containing template.json
- Installed to: ~/.cm/templates/<id>/

**CLI surface:**

- `cm templates pack <dir> -o <pack.zip>`
- `cm templates install <dirOrZip> [--force]`

**Synonyms to avoid:**

- `plugin`

**Owner:** `render`

## Theme

**Term:** Theme

**Definition:** A style-system definition that groups palette + typography + animation + theme caption preset into a coherent visual direction. Themes are resolved per archetype into a Resolved Style.

**Not:**

- Not a render template (templates also choose compositions and render defaults).
- Not a caption preset (burned-in captions use CaptionConfig presets).

**Canonical types:**

- `Theme`
- `ThemeRegistry`

**Where it lives:**

- Registry: src/render/themes/index.ts
- Types: src/render/themes/types.ts

**Synonyms to avoid:**

- `template`

**Owner:** `render`

## Theme Caption Preset

**Term:** ThemeCaptionPreset

**Definition:** A preset used by the render style system (themes -> tokens) to produce consistent on-screen design (typography/colors/position/animation intent). This is used by the theme/style resolver and is distinct from burned-in caption rendering presets.

**Not:**

- Not a `CaptionConfig` preset used by `cm render --caption-preset`.
- Not a render template (templates select compositions and render defaults).

**Canonical types:**

- `ThemeCaptionPreset`
- `ThemeCaptionPresetName`

**Where it lives:**

- Presets: src/render/presets/caption.ts

**Synonyms to avoid:**

- `caption preset`

**Owner:** `render`

## Timestamps Artifact

**Term:** Timestamps

**Definition:** The word-level and scene-level timestamps contract used for caption sync and pacing. Produced by `cm audio` and consumed by `cm visuals` and `cm render`.

**Not:**

- Not the script itself.

**Canonical types:**

- `TimestampsOutput`
- `WordTimestamp`
- `SceneTimestamp`

**Canonical schemas:**

- `TimestampsOutputSchema`
- `WordTimestampSchema`
- `SceneTimestampSchema`

**Where it lives:**

- Artifact: timestamps.json
- Schema: src/audio/schema.ts

**CLI surface:**

- `cm audio --timestamps <path>`
- `cm render --timestamps <path>`

**Owner:** `audio`

## Validation Profile

**Term:** Profile

**Definition:** A named set of validation thresholds for cm validate (e.g. portrait/landscape). Profiles determine what "valid output" means for a target format.

**Not:**

- Not a template (templates affect rendering).

**Canonical types:**

- `ValidateProfileId`

**Where it lives:**

- src/validate/profiles.ts

**CLI surface:**

- `cm validate <video> --profile <id>`

**Owner:** `validate`

## VideoSpec v1 (Reverse-Engineering Artifact)

**Term:** VideoSpec

**Definition:** A single versioned JSON artifact emitted by `cm videospec` that captures a best-effort, reverse-engineered representation of an existing short-form video: shots/timeline, burned-in captions (OCR), transcript (ASR), and narrative summary.

**Not:**

- Not a pipeline artifact produced by `cm generate`.
- Not a render template or script archetype.

**Canonical types:**

- `VideoSpecV1`

**Canonical schemas:**

- `VideoSpecV1Schema`

**Where it lives:**

- Output artifact: videospec.v1.json (by convention, controlled by --output)
- Schema: src/videospec/schema.ts
- Reference: docs/reference/cm-videospec-reference-20260210.md

**CLI surface:**

- `cm videospec -i <video> -o <videospec.v1.json>`

**Synonyms to avoid:**

- `spec (without saying VideoSpec)`

**Owner:** `videospec`

## Visuals Artifact

**Term:** Visuals

**Definition:** The per-scene visual plan consumed by rendering (clips/images per scene, trimming, metadata). Produced by `cm visuals` and consumed by `cm render`.

**Not:**

- Not a template.

**Canonical types:**

- `VisualAsset`
- `VisualsOutput`
- `VisualSource`

**Canonical schemas:**

- `VisualAssetSchema`
- `VisualsOutputSchema`
- `VisualSourceEnum`

**Where it lives:**

- Artifact: visuals.json
- Schema: src/visuals/schema.ts

**CLI surface:**

- `cm visuals --output visuals.json`
- `cm render --input visuals.json`

**Owner:** `visuals`
