/*
 * DO NOT EDIT: generated from docs/reference/ubiquitous-language.yaml
 * Run: npm run ul:gen
 */

export const UBIQUITOUS_TERM_IDS = [
  'audio-mix-preset',
  'caption-config',
  'caption-preset',
  'code-template',
  'gameplay-clip',
  'hook-clip',
  'motion-strategy',
  'pack',
  'packaging-artifact',
  'pipeline-artifact',
  'pipeline-stage',
  'pipeline-workflow',
  'preset',
  'prompt-template',
  'provider',
  'remotion-composition',
  'render-template',
  'script-archetype',
  'sfx-pack',
  'sfx-placement',
  'style-resolver',
  'sync-preset',
  'template-pack',
  'theme',
  'theme-caption-preset',
  'timestamps-artifact',
  'validation-profile',
  'videospec-v1',
  'visuals-artifact',
] as const;

export type UbiquitousTermId = (typeof UBIQUITOUS_TERM_IDS)[number];

export type UbiquitousLanguageTerm = {
  id: UbiquitousTermId;
  canonicalName: string;
  term: string;
  ownedBy: string;
  definition: string;
  canonicalTypes: readonly string[];
  canonicalSchemas: readonly string[];
};

export const UBIQUITOUS_LANGUAGE_TERMS: Record<UbiquitousTermId, UbiquitousLanguageTerm> = {
  'audio-mix-preset': {
    id: 'audio-mix-preset',
    canonicalName: 'Audio Mix Preset',
    term: 'AudioMixPreset',
    ownedBy: 'audio',
    definition:
      'A named set of audio mix defaults (music/SFX/ambience levels and LUFS target) used by the audio mix planner. Mix presets are intended to be data-defined and installable via packs; built-ins ship with CM.',
    canonicalTypes: ['AudioMixPresetId'],
    canonicalSchemas: ['AudioMixPresetIdSchema'],
  },
  'caption-config': {
    id: 'caption-config',
    canonicalName: 'Caption Config',
    term: 'Captions',
    ownedBy: 'render',
    definition:
      'The full caption styling and layout contract used by rendering (fonts, safe zones, display mode, highlighting, cleanup, badges).',
    canonicalTypes: ['CaptionConfig'],
    canonicalSchemas: ['CaptionConfigSchema'],
  },
  'caption-preset': {
    id: 'caption-preset',
    canonicalName: 'Caption Preset',
    term: 'CaptionPreset',
    ownedBy: 'render',
    definition:
      'A named, tested baseline `CaptionConfig` (e.g. tiktok/capcut) that can be deep-overridden by config or CLI flags.',
    canonicalTypes: ['CaptionPresetName'],
    canonicalSchemas: [],
  },
  'code-template': {
    id: 'code-template',
    canonicalName: 'Code Template',
    term: 'CodeTemplate',
    ownedBy: 'render',
    definition:
      'A template pack that also ships a Remotion project (entrypoint + compositions). When a Render Template includes a `remotion` block, CM will execute that code during bundling/render. This requires explicit opt-in via config/flags.',
    canonicalTypes: [],
    canonicalSchemas: ['RemotionTemplateProjectSchema'],
  },
  'gameplay-clip': {
    id: 'gameplay-clip',
    canonicalName: 'Gameplay Clip',
    term: 'GameplayClip',
    ownedBy: 'visuals',
    definition:
      'Optional gameplay footage used by split-screen templates as background (e.g. Subway Surfers).',
    canonicalTypes: ['GameplayClip'],
    canonicalSchemas: ['GameplayClipSchema'],
  },
  'hook-clip': {
    id: 'hook-clip',
    canonicalName: 'Hook Clip',
    term: 'Hook',
    ownedBy: 'hooks',
    definition:
      'A short intro clip used to stop the scroll in the first ~1-3 seconds. Hooks can be selected from a hook library, a local file, or a URL and are layered before the main content.',
    canonicalTypes: ['HookClip', 'HookDefinition'],
    canonicalSchemas: [
      'HookClipSchema',
      'HookDefinitionSchema',
      'HookAudioModeEnum',
      'HookFitEnum',
    ],
  },
  'motion-strategy': {
    id: 'motion-strategy',
    canonicalName: 'Motion Strategy',
    term: 'MotionStrategy',
    ownedBy: 'visuals',
    definition:
      'The technique used to animate static images into moving visuals at render-time (e.g. Ken Burns, parallax). Required for image-based visuals sources.',
    canonicalTypes: ['MotionStrategyType'],
    canonicalSchemas: ['MotionStrategyEnum'],
  },
  pack: {
    id: 'pack',
    canonicalName: 'Pack',
    term: 'Pack',
    ownedBy: 'core',
    definition:
      'A distributable bundle (directory or .zip) containing data-defined CM resources (templates, workflows, archetypes, presets, hooks, etc). Packs are installable locally and should be validated by schemas.',
    canonicalTypes: [],
    canonicalSchemas: [],
  },
  'packaging-artifact': {
    id: 'packaging-artifact',
    canonicalName: 'Packaging Artifact',
    term: 'Packaging',
    ownedBy: 'packaging',
    definition:
      'A versioned JSON artifact produced by `cm package` containing multiple title/cover/hook variants plus a selected winner. Packaging is used to improve CTR (title/cover) and muted autoplay retention.',
    canonicalTypes: ['PackageOutput', 'PackageVariant', 'Platform'],
    canonicalSchemas: ['PackageOutputSchema', 'PackageVariantSchema', 'PlatformEnum'],
  },
  'pipeline-artifact': {
    id: 'pipeline-artifact',
    canonicalName: 'Pipeline Artifact',
    term: 'Artifact',
    ownedBy: 'core',
    definition:
      'An intermediate file produced/consumed by pipeline stages (script.json, audio.wav, timestamps.json, visuals.json, video.mp4). Artifacts are the stable stage contract.',
    canonicalTypes: [],
    canonicalSchemas: [],
  },
  'pipeline-stage': {
    id: 'pipeline-stage',
    canonicalName: 'Pipeline Stage',
    term: 'Stage',
    ownedBy: 'pipeline',
    definition:
      'One step in the pipeline: script, audio, visuals, render. Stages can be run individually or composed via cm generate.',
    canonicalTypes: [],
    canonicalSchemas: [],
  },
  'pipeline-workflow': {
    id: 'pipeline-workflow',
    canonicalName: 'Pipeline Workflow',
    term: 'Workflow',
    ownedBy: 'pipeline',
    definition:
      'A pipeline orchestration preset for cm generate. Workflows can select stage modes (builtin vs external/import), provide default inputs, and provide workflow defaults. Workflows may contain exec hooks, which require explicit opt-in.',
    canonicalTypes: ['WorkflowId', 'WorkflowDefinition'],
    canonicalSchemas: ['WorkflowIdSchema', 'WorkflowDefinitionSchema'],
  },
  preset: {
    id: 'preset',
    canonicalName: 'Preset',
    term: 'Preset',
    ownedBy: 'core',
    definition:
      'A named set of default values for a specific subsystem (e.g. captions, sync, audio mix). Presets tune one subsystem; they do not change pipeline orchestration.',
    canonicalTypes: [],
    canonicalSchemas: [],
  },
  'prompt-template': {
    id: 'prompt-template',
    canonicalName: 'Prompt Template',
    term: 'PromptTemplate',
    ownedBy: 'prompts',
    definition:
      'A reusable text prompt (with variables) used to generate or transform artifacts inside CM (scripts, visuals, metadata, etc). Prompt templates are NOT render templates.',
    canonicalTypes: ['PromptTemplate', 'RenderedPrompt'],
    canonicalSchemas: [],
  },
  provider: {
    id: 'provider',
    canonicalName: 'Provider',
    term: 'Provider',
    ownedBy: 'core',
    definition:
      'An external system/integration used by a stage (LLM providers, stock visuals providers, image generation providers).',
    canonicalTypes: ['VisualsProviderId'],
    canonicalSchemas: ['VisualsProviderIdSchema'],
  },
  'remotion-composition': {
    id: 'remotion-composition',
    canonicalName: 'Remotion Composition',
    term: 'Composition',
    ownedBy: 'render',
    definition:
      'A Remotion composition id that defines the video layout and timeline behavior (React component + animations). Selected by Render Templates via `compositionId`.',
    canonicalTypes: ['CompositionId'],
    canonicalSchemas: ['CompositionIdSchema'],
  },
  'render-template': {
    id: 'render-template',
    canonicalName: 'Render Template',
    term: 'Template',
    ownedBy: 'render',
    definition:
      'A render preset that selects a Remotion composition and provides render defaults (orientation/fps/caption preset/config, split-screen params, required slots).',
    canonicalTypes: ['TemplateId', 'RenderTemplate'],
    canonicalSchemas: ['TemplateIdSchema', 'RenderTemplateSchema'],
  },
  'script-archetype': {
    id: 'script-archetype',
    canonicalName: 'Script Archetype',
    term: 'Archetype',
    ownedBy: 'script',
    definition:
      'A script format (hook + structure + pacing rules) used by the script stage. Archetypes guide the LLM to produce a particular style of script (listicle, tutorial, story, etc).',
    canonicalTypes: ['ArchetypeId', 'ArchetypeSpec'],
    canonicalSchemas: ['ArchetypeIdSchema', 'ArchetypeSpecSchema'],
  },
  'sfx-pack': {
    id: 'sfx-pack',
    canonicalName: 'SFX Pack',
    term: 'SfxPack',
    ownedBy: 'audio',
    definition:
      'A named bundle of short sound effects used by the audio mix planner (pops/whooshes/clicks/etc). Packs are intended to be installable and data-only by default.',
    canonicalTypes: ['SfxPackId'],
    canonicalSchemas: ['SfxPackIdSchema'],
  },
  'sfx-placement': {
    id: 'sfx-placement',
    canonicalName: 'SFX Placement',
    term: 'SfxPlacement',
    ownedBy: 'audio',
    definition:
      'A scheduling rule for when SFX events are placed relative to the script timeline (hook/scene/list-item/cta).',
    canonicalTypes: ['SfxPlacement'],
    canonicalSchemas: ['SfxPlacementEnum'],
  },
  'style-resolver': {
    id: 'style-resolver',
    canonicalName: 'Style Resolver',
    term: 'StyleResolver',
    ownedBy: 'render',
    definition:
      'The function that resolves Theme references into concrete, render-ready style values (colors, typography, animation, safe zones).',
    canonicalTypes: ['StyleResolverDeps', 'ResolvedStyle', 'StyleOverrides'],
    canonicalSchemas: [],
  },
  'sync-preset': {
    id: 'sync-preset',
    canonicalName: 'Sync Preset',
    term: 'SyncPreset',
    ownedBy: 'sync',
    definition:
      'A named quality/speed tradeoff preset for timestamp sync in `cm generate` (fast/standard/quality/maximum). Sync presets set pipeline mode (standard vs audio-first) and related sync-quality options.',
    canonicalTypes: ['SyncPresetConfig'],
    canonicalSchemas: [],
  },
  'template-pack': {
    id: 'template-pack',
    canonicalName: 'Template Pack',
    term: 'TemplatePack',
    ownedBy: 'render',
    definition:
      'A distributable bundle (directory or .zip) that installs a Render Template into `~/.cm/templates/<id>/...` (template.json + optional local assets).',
    canonicalTypes: [],
    canonicalSchemas: [],
  },
  theme: {
    id: 'theme',
    canonicalName: 'Theme',
    term: 'Theme',
    ownedBy: 'render',
    definition:
      'A style-system definition that groups palette + typography + animation + theme caption preset into a coherent visual direction. Themes are resolved per archetype into a Resolved Style.',
    canonicalTypes: ['Theme', 'ThemeRegistry'],
    canonicalSchemas: [],
  },
  'theme-caption-preset': {
    id: 'theme-caption-preset',
    canonicalName: 'Theme Caption Preset',
    term: 'ThemeCaptionPreset',
    ownedBy: 'render',
    definition:
      'A preset used by the render style system (themes -> tokens) to produce consistent on-screen design (typography/colors/position/animation intent). This is used by the theme/style resolver and is distinct from burned-in caption rendering presets.',
    canonicalTypes: ['ThemeCaptionPreset', 'ThemeCaptionPresetName'],
    canonicalSchemas: [],
  },
  'timestamps-artifact': {
    id: 'timestamps-artifact',
    canonicalName: 'Timestamps Artifact',
    term: 'Timestamps',
    ownedBy: 'audio',
    definition:
      'The word-level and scene-level timestamps contract used for caption sync and pacing. Produced by `cm audio` and consumed by `cm visuals` and `cm render`.',
    canonicalTypes: ['TimestampsOutput', 'WordTimestamp', 'SceneTimestamp'],
    canonicalSchemas: ['TimestampsOutputSchema', 'WordTimestampSchema', 'SceneTimestampSchema'],
  },
  'validation-profile': {
    id: 'validation-profile',
    canonicalName: 'Validation Profile',
    term: 'Profile',
    ownedBy: 'validate',
    definition:
      'A named set of validation thresholds for cm validate (e.g. portrait/landscape). Profiles determine what "valid output" means for a target format.',
    canonicalTypes: ['ValidateProfileId'],
    canonicalSchemas: [],
  },
  'videospec-v1': {
    id: 'videospec-v1',
    canonicalName: 'VideoSpec v1 (Reverse-Engineering Artifact)',
    term: 'VideoSpec',
    ownedBy: 'videospec',
    definition:
      'A single versioned JSON artifact emitted by `cm videospec` that captures a best-effort, reverse-engineered representation of an existing short-form video: shots/timeline, burned-in captions (OCR), transcript (ASR), and narrative summary.',
    canonicalTypes: ['VideoSpecV1'],
    canonicalSchemas: ['VideoSpecV1Schema'],
  },
  'visuals-artifact': {
    id: 'visuals-artifact',
    canonicalName: 'Visuals Artifact',
    term: 'Visuals',
    ownedBy: 'visuals',
    definition:
      'The per-scene visual plan consumed by rendering (clips/images per scene, trimming, metadata). Produced by `cm visuals` and consumed by `cm render`.',
    canonicalTypes: ['VisualAsset', 'VisualsOutput', 'VisualSource'],
    canonicalSchemas: ['VisualAssetSchema', 'VisualsOutputSchema', 'VisualSourceEnum'],
  },
} as const;
