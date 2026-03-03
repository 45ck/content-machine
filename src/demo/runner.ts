import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { generateScript } from '../script/generator';
import { generateAudio } from '../audio/pipeline';
import { matchVisuals } from '../visuals/matcher';
import { renderVideo } from '../render/service';
import { FakeLLMProvider } from '../test/stubs/fake-llm';
import { ArchetypeIdSchema } from '../domain/ids';
import { DEFAULT_ARTIFACT_FILENAMES } from '../domain/repo-facts.generated';
import {
  getTemplateFontSources,
  getTemplateOverlays,
  getTemplateParams,
  resolveRenderTemplate,
} from '../render/templates';
import type { CaptionConfigInput } from '../render/captions/config';
import type { ResolvedRenderTemplate } from '../render/templates';
import type { CaptionPresetName } from '../render/captions/presets';

export interface DemoOptions {
  outputPath: string;
  topic?: string;
  durationSeconds?: number;
  /**
   * Optional template id or path to template.json.
   * When provided, template defaults (captionPreset/orientation/fps) and assets (overlays/fonts)
   * are applied during render.
   */
  template?: string;
  /**
   * Demo render mode:
   * - placeholder: fast, always succeeds, emits a tiny placeholder mp4
   * - real: bundles + renders via Remotion (still mock providers; no API keys)
   */
  renderMode?: 'placeholder' | 'real';
}

export interface DemoResult {
  outputPath: string;
  artifactsDir: string;
  scriptPath: string;
  audioPath: string;
  timestampsPath: string;
  visualsPath: string;
}

function createDemoScriptResponse(topic: string): {
  scenes: Array<{ text: string; visualDirection: string; mood: string }>;
  reasoning: string;
  title: string;
  hook: string;
  cta: string;
  hashtags: string[];
} {
  // Keep this deterministic and listicle-shaped so we trigger list badges in TikTok preset
  // (e.g. "1:" / "2:" tokens).
  //
  // Target: ~40 words => ~12s at 0.3s/word in mock audio.
  const scenes = [
    {
      text: '1: Run cm doctor. Fix issues fast everywhere.',
      visualDirection: 'Terminal + checklist UI',
      mood: 'confident',
    },
    {
      text: '2: Run cm demo. Generate a deterministic short mp4.',
      visualDirection: 'Short-form video preview',
      mood: 'engaging',
    },
    {
      text: '3: Add overlays and fonts via templates easily.',
      visualDirection: 'Branded layout with watermark',
      mood: 'polished',
    },
    {
      text: '4: Use cm videospec on a URL quickly.',
      visualDirection: 'Reverse-engineered timeline',
      mood: 'curious',
    },
    {
      text: '5: Compare variants in cm lab. Iterate.',
      visualDirection: 'A/B compare + ratings',
      mood: 'pragmatic',
    },
  ];

  return {
    scenes,
    reasoning: 'Deterministic mock script for onboarding demo (no API keys required).',
    title: `Mock: ${topic}`,
    hook: scenes[0].text,
    cta: scenes[scenes.length - 1].text,
    hashtags: ['#contentmachine', '#demo', '#mock'],
  };
}

function resolveDemoTemplateDefaults(resolved: ResolvedRenderTemplate | null): {
  orientation: 'portrait' | 'landscape' | 'square';
  fps: number;
  captionPreset: CaptionPresetName;
  captionConfig?: CaptionConfigInput;
} {
  const defaults = resolved?.template.defaults as Record<string, unknown> | undefined;
  const orientation =
    (defaults?.orientation === 'portrait' ||
    defaults?.orientation === 'landscape' ||
    defaults?.orientation === 'square'
      ? defaults.orientation
      : undefined) ?? 'portrait';
  const fpsRaw = defaults?.fps;
  const fps = typeof fpsRaw === 'number' && Number.isFinite(fpsRaw) && fpsRaw > 0 ? fpsRaw : 30;
  const captionPreset =
    (typeof defaults?.captionPreset === 'string'
      ? (defaults.captionPreset as CaptionPresetName)
      : undefined) ?? 'tiktok';
  const captionConfig = (defaults?.captionConfig ?? undefined) as CaptionConfigInput | undefined;

  return { orientation, fps, captionPreset, captionConfig };
}

/**
 * Run the pipeline in mock mode and write its intermediate artifacts next to the output.
 *
 * Intended for smoke testing and local demos without API keys.
 */
export async function runDemo(options: DemoOptions): Promise<DemoResult> {
  const outputPath = resolve(options.outputPath);
  const artifactsDir = dirname(outputPath);
  const topic = options.topic ?? 'Content Machine demo';
  const durationSeconds = options.durationSeconds ?? 20;
  const renderMode = options.renderMode ?? 'placeholder';

  const resolvedTemplate = options.template ? await resolveRenderTemplate(options.template) : null;
  const templateOverlays = resolvedTemplate
    ? getTemplateOverlays(resolvedTemplate.template, resolvedTemplate.templateDir)
    : [];
  const templateFonts = resolvedTemplate
    ? getTemplateFontSources(resolvedTemplate.template, resolvedTemplate.templateDir)
    : [];
  const templateParams: Record<string, unknown> = resolvedTemplate
    ? (getTemplateParams(resolvedTemplate.template) as Record<string, unknown>)
    : {};
  const templateDefaults = resolveDemoTemplateDefaults(resolvedTemplate);

  await mkdir(artifactsDir, { recursive: true });

  const llm = new FakeLLMProvider();
  llm.queueJsonResponse(createDemoScriptResponse(topic));
  const script = await generateScript({
    topic,
    archetype: ArchetypeIdSchema.parse('listicle'),
    targetDuration: durationSeconds,
    llmProvider: llm,
  });

  const scriptPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script);
  await writeFile(scriptPath, JSON.stringify(script, null, 2), 'utf-8');

  const audioPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.audio);
  const timestampsPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps);
  const audio = await generateAudio({
    script,
    voice: 'af_heart',
    outputPath: audioPath,
    timestampsPath,
    mock: true,
  });

  const visuals = await matchVisuals({
    timestamps: audio.timestamps,
    orientation: templateDefaults.orientation,
    mock: true,
  });

  const visualsPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals);
  await writeFile(visualsPath, JSON.stringify(visuals, null, 2), 'utf-8');

  await renderVideo({
    visuals,
    timestamps: audio.timestamps,
    audioPath,
    outputPath,
    orientation: templateDefaults.orientation,
    fps: templateDefaults.fps,
    compositionId: resolvedTemplate?.template.compositionId,
    captionPreset: templateDefaults.captionPreset,
    captionConfig: templateDefaults.captionConfig,
    overlays: templateOverlays.length > 0 ? templateOverlays : undefined,
    fonts: templateFonts.length > 0 ? templateFonts : undefined,
    templateId: resolvedTemplate?.template.id,
    templateSource: resolvedTemplate?.source,
    templateParams,
    mock: true,
    mockRenderMode: renderMode === 'real' ? 'real' : undefined,
  });

  return { outputPath, artifactsDir, scriptPath, audioPath, timestampsPath, visualsPath };
}
