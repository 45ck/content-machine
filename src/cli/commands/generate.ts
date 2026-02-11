/**
 * Generate command - Full pipeline: topic -> video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { evaluateRequirements, planWhisperRequirements } from '../../core/assets/requirements';
import { OrientationEnum, type Archetype, type Orientation } from '../../core/config';
import { loadConfig } from '../../core/config';
import { formatArchetypeSource, resolveArchetype } from '../../archetypes/registry';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { createSpinner } from '../progress';
import { chalk } from '../colors';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { parseTemplateDepsMode, resolveTemplateDepsInstallDecision } from '../template-code';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { OpenAIProvider } from '../../core/llm/openai';
import { CMError, SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';
import { getCliErrorInfo } from '../format';
import {
  DEFAULT_ARTIFACT_FILENAMES,
  LLM_PROVIDERS,
  REPO_FACTS,
  VISUALS_PROVIDERS,
} from '../../domain/repo-facts.generated';
import {
  formatTemplateSource,
  resolveRenderTemplate,
  getTemplateFontSources,
  getTemplateGameplaySlot,
  getTemplateOverlays,
  getTemplateParams,
  mergeFontSources,
  resolveRemotionTemplateProject,
  type ResolvedRemotionTemplateProject,
} from '../../render/templates';
import {
  AudioMixOutputSchema,
  AudioOutputSchema,
  OverlayAsset,
  ResearchOutputSchema,
  ScriptOutputSchema,
  TimestampsOutputSchema,
  VisualsOutputSchema,
  type AudioOutput,
  type CaptionQualityRatingOutput,
  type FontSource,
  type HookClip,
  type ResearchOutput,
  type ResearchSource,
  type ScriptOutput,
  type SyncRatingOutput,
  type VisualsOutput,
  type WorkflowDefinition,
  type WorkflowStageMode,
} from '../../domain';
import type { CaptionConfigInput } from '../../render/captions/config';
import { hasAudioMixSources, type AudioMixPlanOptions } from '../../audio/mix/planner';
import { probeAudioWithFfprobe } from '../../validate/ffprobe-audio';
import type { CaptionPresetName } from '../../render/captions/presets';
import { resolveHookFromCli } from '../hooks';
import {
  runGenerateWithSyncQualityGate,
  type SyncAttemptSettings,
  type SyncQualitySummary,
} from './generate-quality';
import {
  runGenerateWithCaptionQualityGate,
  type CaptionAttemptSettings,
} from './caption-quality-gate';
import { resolveWorkflow, formatWorkflowSource } from '../../workflows/resolve';
import {
  collectWorkflowPostCommands,
  collectWorkflowPreCommands,
  resolveWorkflowStageMode,
  runWorkflowCommands,
  workflowHasExec,
} from '../../workflows/runner';

/**
 * Sync quality presets for different quality/speed tradeoffs
 *
 * @cmTerm sync-preset
 */
export interface SyncPresetConfig {
  pipeline: 'standard' | 'audio-first';
  reconcile: boolean;
  syncQualityCheck: boolean;
  minSyncRating: number;
  autoRetrySync: boolean;
}

const PIPELINE_STANDARD: SyncPresetConfig['pipeline'] = 'standard';
const PIPELINE_AUDIO_FIRST: SyncPresetConfig['pipeline'] = 'audio-first';

export const SYNC_PRESETS: Record<string, SyncPresetConfig> = {
  /** Fast: standard pipeline, no quality check, fastest rendering */
  fast: {
    pipeline: PIPELINE_STANDARD,
    reconcile: false,
    syncQualityCheck: false,
    minSyncRating: 0,
    autoRetrySync: false,
  },
  /** Standard: audio-first pipeline (whisper required), no quality check */
  standard: {
    pipeline: PIPELINE_AUDIO_FIRST,
    reconcile: true,
    syncQualityCheck: false,
    minSyncRating: 60,
    autoRetrySync: false,
  },
  /** Quality: audio-first with quality check enabled */
  quality: {
    pipeline: PIPELINE_AUDIO_FIRST,
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 75,
    autoRetrySync: false,
  },
  /** Maximum: audio-first with reconcile, quality check, and auto-retry */
  maximum: {
    pipeline: PIPELINE_AUDIO_FIRST,
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 85,
    autoRetrySync: true,
  },
};

interface GenerateOptions {
  archetype: string;
  output: string;
  orientation: string;
  template?: string;
  workflow?: string;
  workflowAllowExec?: boolean;
  script?: string;
  audio?: string;
  audioMix?: string;
  timestamps?: string;
  visuals?: string;
  fps?: string;
  captionPreset?: string;
  voice: string;
  duration: string;
  keepArtifacts: boolean;
  mock: boolean;
  dryRun: boolean;
  research?: string | boolean;
  pipeline?: 'standard' | 'audio-first';
  /** Split-screen layout preset (gameplay-top, gameplay-bottom) */
  splitLayout?: string;
  /** Whisper model size: tiny, base, small, medium, large */
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  /** Caption grouping window in milliseconds */
  captionGroupMs?: string;
  /** Reconcile ASR output to original script text */
  reconcile?: boolean;
  /** Sync quality preset: fast, standard, quality, maximum */
  syncPreset?: string;
  /** Enable sync quality check after render */
  syncQualityCheck?: boolean;
  /** Minimum acceptable sync rating (0-100) */
  minSyncRating?: string;
  /** Auto-retry with better sync strategy if rating fails */
  autoRetrySync?: boolean;
  /** Enable burned-in caption quality check (OCR-only) after render */
  captionQualityCheck?: boolean;
  /** Enable higher-quality defaults (slower) */
  quality?: boolean;
  /** Minimum acceptable caption overall score (0..1, or 0..100) */
  minCaptionOverall?: string;
  /** Auto-retry with caption tuning if caption quality fails */
  autoRetryCaptions?: boolean;
  /** Maximum number of caption tuning retries after the initial attempt */
  maxCaptionRetries?: string;
  /** Force a "perfect captions" optimization loop (enables caption quality gate + retries) */
  captionPerfect?: boolean;
  /** Use mock caption quality scoring (no OCR) */
  captionQualityMock?: boolean;
  /** Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence) */
  captionMode?: 'page' | 'single' | 'buildup' | 'chunk';
  /** Words per caption page/group (default: 8) */
  wordsPerPage?: string;
  /** Max words per caption page/group (alias of wordsPerPage) */
  captionMaxWords?: string;
  /** Minimum words per caption page/group */
  captionMinWords?: string;
  /** Target words per chunk (chunk mode) */
  captionTargetWords?: string;
  /** Max words per minute for caption pacing */
  captionMaxWpm?: string;
  /** Max characters per second for caption pacing */
  captionMaxCps?: string;
  /** Minimum on-screen time for captions (ms) */
  captionMinOnScreenMs?: string;
  /** Minimum on-screen time for short captions (ms) */
  captionMinOnScreenMsShort?: string;
  /** Drop filler words from captions */
  captionDropFillers?: boolean;
  /** Drop list markers like "1:" from captions */
  captionDropListMarkers?: boolean;
  /** Comma-separated filler words/phrases to drop */
  captionFillerWords?: string;
  /** Maximum lines per caption page (default: 2) */
  maxLines?: string;
  /** Maximum characters per line (default: 25) */
  charsPerLine?: string;
  /** Caption animation: none (default), fade, slideUp, slideDown, pop, bounce */
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
  /** Active word animation: none (default), pop, bounce, rise, shake */
  captionWordAnimation?: 'none' | 'pop' | 'bounce' | 'rise' | 'shake';
  /** Active word animation duration in ms */
  captionWordAnimationMs?: string;
  /** Active word animation intensity (0..1) */
  captionWordAnimationIntensity?: string;
  /** Global caption timing offset in ms (negative = earlier captions) */
  captionOffsetMs?: string;
  /** Caption font family override */
  captionFontFamily?: string;
  /** Caption font weight override */
  captionFontWeight?: string;
  /** Caption font file path to bundle */
  captionFontFile?: string;
  /** Caption font sources (from config) */
  captionFonts?: FontSource[];
  /** Gameplay library directory or clip file path */
  gameplay?: string;
  /** Gameplay subfolder name */
  gameplayStyle?: string;
  /** Fail if gameplay clip is missing */
  gameplayStrict?: boolean;
  /** Gameplay placement for split-screen templates */
  gameplayPosition?: 'top' | 'bottom' | 'full';
  /** Content placement for split-screen templates */
  contentPosition?: 'top' | 'bottom' | 'full';
  /** Hook intro clip id, path, or URL */
  hook?: string;
  /** Hook library id (defaults to config) */
  hookLibrary?: string;
  /** Root directory for hook libraries */
  hooksDir?: string;
  /** Hook duration when ffprobe is unavailable */
  hookDuration?: string;
  /** Trim hook to N seconds (optional) */
  hookTrim?: string;
  /** Hook audio mode (mute, keep) */
  hookAudio?: string;
  /** Hook fit mode (cover, contain) */
  hookFit?: string;
  /** Download missing hook clips */
  downloadHook?: boolean;
  /** Download remote stock assets into the render bundle (recommended) */
  downloadAssets?: boolean;
  /** Background music track or preset */
  music?: string | boolean;
  /** Music volume (db) */
  musicVolume?: string;
  /** Music ducking under voice (db) */
  musicDuck?: string;
  /** Loop music to voice duration */
  musicLoop?: boolean;
  /** Music fade-in (ms) */
  musicFadeIn?: string;
  /** Music fade-out (ms) */
  musicFadeOut?: string;
  /** Explicit SFX files (repeatable) */
  sfx?: string[] | boolean;
  /** SFX pack id */
  sfxPack?: string;
  /** SFX placement strategy */
  sfxAt?: string;
  /** SFX volume (db) */
  sfxVolume?: string;
  /** Minimum gap between SFX (ms) */
  sfxMinGap?: string;
  /** Default SFX duration (seconds) */
  sfxDuration?: string;
  /** Ambience bed track or preset */
  ambience?: string | boolean;
  /** Ambience volume (db) */
  ambienceVolume?: string;
  /** Loop ambience to voice duration */
  ambienceLoop?: boolean;
  /** Ambience fade-in (ms) */
  ambienceFadeIn?: string;
  /** Ambience fade-out (ms) */
  ambienceFadeOut?: string;
  /** Mix preset */
  mixPreset?: string;
  /** Loudness target */
  lufsTarget?: string;
  /** Validate dependencies without running the pipeline */
  preflight?: boolean;

  /** Allow executing Remotion code shipped inside template packs (code templates). */
  allowTemplateCode?: boolean;
  /** Template dependency install mode for code templates (auto, prompt, never). */
  templateDeps?: string;
  /** Template package manager (npm, pnpm, yarn). */
  templatePm?: string;
}

function printHeader(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (runtime.json) return;

  writeStderrLine(chalk.bold('content-machine'));
  writeStderrLine(chalk.gray(`Topic: ${topic}`));
  writeStderrLine(chalk.gray(`Archetype: ${options.archetype}`));
  if (options.template) {
    writeStderrLine(chalk.gray(`Template: ${options.template}`));
  }
  if (options.workflow) {
    writeStderrLine(chalk.gray(`Workflow: ${options.workflow}`));
  }
  if (options.gameplay) {
    writeStderrLine(chalk.gray(`Gameplay: ${options.gameplay}`));
  }
  if (options.hook) {
    writeStderrLine(chalk.gray(`Hook: ${options.hook}`));
  }
  writeStderrLine(chalk.gray(`Output: ${options.output}`));
  writeStderrLine(chalk.gray(`Artifacts: ${dirname(options.output)}`));
}

function writeDryRunJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: {
        topic,
        archetype,
        orientation,
        template: templateSpec,
        resolvedTemplateId,
        workflow: options.workflow ?? null,
        workflowAllowExec: Boolean(options.workflowAllowExec),
        script: options.script ?? null,
        audio: options.audio ?? null,
        audioMix: options.audioMix ?? null,
        timestamps: options.timestamps ?? null,
        visuals: options.visuals ?? null,
        fps: options.fps ?? '30',
        captionPreset: options.captionPreset ?? 'tiktok',
        captionMode: options.captionMode ?? null,
        wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
        captionMaxWords: parseOptionalInt(options.captionMaxWords),
        captionMinWords: parseOptionalInt(options.captionMinWords),
        captionTargetWords: parseOptionalInt(options.captionTargetWords),
        captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
        captionMaxCps: parseOptionalNumber(options.captionMaxCps),
        captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
        captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
        captionDropFillers: options.captionDropFillers ?? null,
        captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        music: typeof options.music === 'string' ? options.music : null,
        musicVolumeDb: parseOptionalNumber(options.musicVolume),
        musicDuckDb: parseOptionalNumber(options.musicDuck),
        musicLoop: options.musicLoop ?? null,
        musicFadeInMs: parseOptionalInt(options.musicFadeIn),
        musicFadeOutMs: parseOptionalInt(options.musicFadeOut),
        sfx: Array.isArray(options.sfx) ? options.sfx : null,
        sfxPack: options.sfxPack ?? null,
        sfxAt: parseSfxPlacement(options.sfxAt) ?? null,
        sfxVolumeDb: parseOptionalNumber(options.sfxVolume),
        sfxMinGapMs: parseOptionalInt(options.sfxMinGap),
        sfxDurationSeconds: parseOptionalNumber(options.sfxDuration),
        ambience: typeof options.ambience === 'string' ? options.ambience : null,
        ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume),
        ambienceLoop: options.ambienceLoop ?? null,
        ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn),
        ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut),
        mixPreset: options.mixPreset ?? null,
        lufsTarget: parseOptionalNumber(options.lufsTarget),
        gameplay: options.gameplay ?? null,
        gameplayStyle: options.gameplayStyle ?? null,
        gameplayStrict: Boolean(options.gameplayStrict),
        splitLayout: options.splitLayout ?? null,
        gameplayPosition: options.gameplayPosition ?? null,
        contentPosition: options.contentPosition ?? null,
        hook: options.hook ?? null,
        hookLibrary: options.hookLibrary ?? null,
        hooksDir: options.hooksDir ?? null,
        hookDuration: options.hookDuration ?? null,
        hookTrim: options.hookTrim ?? null,
        hookAudio: options.hookAudio ?? null,
        hookFit: options.hookFit ?? null,
        downloadAssets: options.downloadAssets !== false,
        dryRun: true,
      },
      outputs: { dryRun: true, artifactsDir },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

type PreflightStatus = 'ok' | 'warn' | 'fail';

interface PreflightCheck {
  label: string;
  status: PreflightStatus;
  detail?: string;
  fix?: string;
  code?: string;
}

const PREFLIGHT_USAGE_CODES = new Set([
  'INVALID_ARGUMENT',
  'SCHEMA_ERROR',
  'FILE_NOT_FOUND',
  'INVALID_JSON',
]);

function addPreflightCheck(checks: PreflightCheck[], entry: PreflightCheck): void {
  checks.push(entry);
}

function formatPreflightLine(check: PreflightCheck): string {
  const status =
    check.status === 'ok'
      ? chalk.green('OK ')
      : check.status === 'warn'
        ? chalk.yellow('WARN')
        : chalk.red('FAIL');
  const detail = check.detail ? ` - ${check.detail}` : '';
  return `- ${status} ${check.label}${detail}`;
}

async function runGeneratePreflight(params: {
  topic: string;
  options: GenerateOptions;
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  runtime: ReturnType<typeof getCliRuntime>;
  command: Command;
  resolvedWorkflow?: Awaited<ReturnType<typeof resolveWorkflow>>;
  workflowError?: ReturnType<typeof getCliErrorInfo> | null;
}): Promise<{ passed: boolean; checks: PreflightCheck[]; exitCode: number }> {
  const { options, resolvedTemplate, templateGameplay, command, resolvedWorkflow, workflowError } =
    params;
  const checks: PreflightCheck[] = [];
  const stageModes = resolveWorkflowStageModes(resolvedWorkflow?.workflow);

  const templateId = resolvedTemplate?.template.id;
  addPreflightCheck(checks, {
    label: 'Template',
    status: 'ok',
    detail: templateId ? `${templateId} (${formatTemplateSource(resolvedTemplate)})` : 'default',
  });

  let remotionProject: ResolvedRemotionTemplateProject | null = null;
  if (resolvedTemplate) {
    try {
      remotionProject = resolveRemotionTemplateProject(resolvedTemplate);
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Template code',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (remotionProject) {
    const config = loadConfig();

    const allowTemplateCodeSource = command.getOptionValueSource('allowTemplateCode');
    const allowTemplateCode =
      allowTemplateCodeSource === 'default' || allowTemplateCodeSource === undefined
        ? Boolean(config.render.allowTemplateCode)
        : Boolean(options.allowTemplateCode);

    addPreflightCheck(checks, {
      label: 'Template code',
      status: allowTemplateCode ? 'ok' : 'fail',
      code: allowTemplateCode ? undefined : 'INVALID_ARGUMENT',
      detail: allowTemplateCode ? `Enabled (${remotionProject.entryPoint})` : 'Disabled',
      fix: allowTemplateCode
        ? undefined
        : 'Re-run with --allow-template-code to allow executing template-provided Remotion code',
    });

    const hasPkg = existsSync(join(remotionProject.rootDir, 'package.json'));
    const hasNodeModules = existsSync(join(remotionProject.rootDir, 'node_modules'));

    if (hasPkg && hasNodeModules) {
      addPreflightCheck(checks, {
        label: 'Template deps',
        status: 'ok',
        detail: `${remotionProject.rootDir}/node_modules`,
      });
    } else if (hasPkg && !hasNodeModules) {
      let templateDepsMode: ReturnType<typeof parseTemplateDepsMode> | undefined;
      try {
        const templateDepsSource = command.getOptionValueSource('templateDeps');
        const templateDepsRaw =
          templateDepsSource === 'default' || templateDepsSource === undefined
            ? (remotionProject.installDeps ?? config.render.templateDeps)
            : options.templateDeps;
        templateDepsMode = parseTemplateDepsMode(templateDepsRaw ?? 'prompt');
      } catch (error) {
        const info = getCliErrorInfo(error);
        addPreflightCheck(checks, {
          label: 'Template deps',
          status: 'fail',
          code: info.code,
          detail: info.message,
          fix: info.fix,
        });
        templateDepsMode = undefined;
      }

      const mode = templateDepsMode ?? 'prompt';
      if (params.runtime.offline) {
        addPreflightCheck(checks, {
          label: 'Template deps',
          status: 'warn',
          detail: 'node_modules missing (offline mode enabled; will not auto-install)',
          fix: 'Install dependencies manually in the template rootDir if bundling fails',
        });
      } else if (mode === 'never') {
        addPreflightCheck(checks, {
          label: 'Template deps',
          status: 'warn',
          detail: 'node_modules missing (--template-deps never)',
          fix: 'Run `npm install` in the template rootDir, or re-run with --template-deps auto',
        });
      } else if (mode === 'auto') {
        addPreflightCheck(checks, {
          label: 'Template deps',
          status: 'warn',
          detail: 'node_modules missing (will install automatically at render time)',
          fix: 'Run `npm install` in the template rootDir to avoid installs during generation',
        });
      } else {
        // prompt
        const canPrompt = params.runtime.isTty && !params.runtime.json;
        const willInstall = Boolean(params.runtime.yes);
        if (willInstall) {
          addPreflightCheck(checks, {
            label: 'Template deps',
            status: 'warn',
            detail: 'node_modules missing (--yes will auto-install)',
            fix: 'Run `npm install` in the template rootDir to avoid installs during generation',
          });
        } else if (canPrompt) {
          addPreflightCheck(checks, {
            label: 'Template deps',
            status: 'warn',
            detail: 'node_modules missing (will prompt to install)',
            fix: 'Run `npm install` in the template rootDir, or pass --template-deps auto',
          });
        } else {
          addPreflightCheck(checks, {
            label: 'Template deps',
            status: 'warn',
            detail: 'node_modules missing (non-interactive mode cannot prompt)',
            fix: 'Run `npm install` in the template rootDir, or pass --template-deps auto',
          });
        }
      }
    } else {
      addPreflightCheck(checks, {
        label: 'Template deps',
        status: 'ok',
        detail: 'No package.json (no deps install needed)',
      });
    }
  }

  if (options.workflow) {
    if (workflowError) {
      addPreflightCheck(checks, {
        label: 'Workflow',
        status: 'fail',
        code: workflowError.code,
        detail: workflowError.message,
        fix: workflowError.fix,
      });
    } else if (resolvedWorkflow) {
      addPreflightCheck(checks, {
        label: 'Workflow',
        status: 'ok',
        detail: `${resolvedWorkflow.workflow.id} (${formatWorkflowSource(resolvedWorkflow)})`,
      });
    }

    if (resolvedWorkflow) {
      const workflowExec = workflowHasExec(resolvedWorkflow.workflow);
      if (workflowExec && !options.workflowAllowExec) {
        addPreflightCheck(checks, {
          label: 'Workflow exec',
          status: 'fail',
          code: 'INVALID_ARGUMENT',
          detail: 'Workflow contains exec hooks but --workflow-allow-exec is not set',
          fix: 'Re-run with --workflow-allow-exec to allow workflow commands',
        });
      } else if (workflowExec) {
        addPreflightCheck(checks, {
          label: 'Workflow exec',
          status: 'ok',
          detail: 'Workflow exec hooks allowed',
        });
      }
    }
  }

  if (options.workflow && isExternalStageMode(stageModes.render)) {
    addPreflightCheck(checks, {
      label: 'Workflow render stage',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'External render stages are not supported in cm generate',
      fix: 'Remove render.stage overrides or run `cm render` separately after generate',
    });
  }

  if (options.workflow && isExternalStageMode(stageModes.script) && !options.script) {
    addPreflightCheck(checks, {
      label: 'Workflow script input',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Workflow script stage is external but no script input was provided',
      fix: 'Provide --script or set workflow.inputs.script',
    });
  }

  if (options.workflow && isExternalStageMode(stageModes.audio)) {
    if (!options.audio) {
      addPreflightCheck(checks, {
        label: 'Workflow audio input',
        status: 'fail',
        code: 'INVALID_ARGUMENT',
        detail: 'Workflow audio stage is external but no audio input was provided',
        fix: 'Provide --audio and --timestamps or set workflow.inputs.audio',
      });
    }
    if (!options.timestamps) {
      addPreflightCheck(checks, {
        label: 'Workflow timestamps input',
        status: 'fail',
        code: 'INVALID_ARGUMENT',
        detail: 'Workflow audio stage is external but no timestamps input was provided',
        fix: 'Provide --timestamps or set workflow.inputs.timestamps',
      });
    }
  }

  if (options.workflow && isExternalStageMode(stageModes.visuals) && !options.visuals) {
    addPreflightCheck(checks, {
      label: 'Workflow visuals input',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Workflow visuals stage is external but no visuals input was provided',
      fix: 'Provide --visuals or set workflow.inputs.visuals',
    });
  }

  if (typeof options.research === 'string') {
    const normalized = options.research.trim().toLowerCase();
    if (normalized === 'true') {
      addPreflightCheck(checks, {
        label: 'Research file',
        status: 'ok',
        detail: 'auto (run Stage 0 research)',
      });
    } else if (normalized === 'false') {
      // Explicitly disabled; no check needed.
    } else {
      try {
        const raw = await readInputFile(options.research);
        const parsed = ResearchOutputSchema.safeParse(raw);
        if (!parsed.success) {
          addPreflightCheck(checks, {
            label: 'Research file',
            status: 'fail',
            code: 'SCHEMA_ERROR',
            detail: 'Invalid research JSON',
            fix: 'Generate via `cm research -q "<topic>" -o research.json` and pass --research research.json',
          });
        } else {
          addPreflightCheck(checks, {
            label: 'Research file',
            status: 'ok',
            detail: options.research,
          });
        }
      } catch (error) {
        const info = getCliErrorInfo(error);
        addPreflightCheck(checks, {
          label: 'Research file',
          status: 'fail',
          code: info.code,
          detail: info.message,
          fix: info.fix,
        });
      }
    }
  }

  const workflowExecAllowed =
    Boolean(options.workflowAllowExec) && resolvedWorkflow
      ? workflowHasExec(resolvedWorkflow.workflow)
      : false;

  const shouldWarnMissing = (optionName: string, info: ReturnType<typeof getCliErrorInfo>) =>
    workflowExecAllowed &&
    info.code === 'FILE_NOT_FOUND' &&
    command.getOptionValueSource(optionName) === 'default';

  if (options.audio && !options.timestamps) {
    addPreflightCheck(checks, {
      label: 'Audio timestamps',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Audio provided without timestamps',
      fix: 'Provide --timestamps <path> alongside --audio',
    });
  }

  if (options.timestamps && !options.audio) {
    addPreflightCheck(checks, {
      label: 'Audio file',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Timestamps provided without audio',
      fix: 'Provide --audio <path> alongside --timestamps',
    });
  }

  if (options.script) {
    try {
      const rawScript = await readInputFile(options.script);
      const parsedScript = ScriptOutputSchema.safeParse(rawScript);
      if (!parsedScript.success) {
        addPreflightCheck(checks, {
          label: 'Script input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid script JSON',
          fix: 'Generate a script via `cm script --topic "<topic>" -o script.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Script input',
          status: 'ok',
          detail: options.script,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Script input',
        status: shouldWarnMissing('script', info) ? 'warn' : 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (options.audio) {
    if (existsSync(options.audio)) {
      addPreflightCheck(checks, {
        label: 'Audio input',
        status: 'ok',
        detail: options.audio,
      });
    } else {
      const info = getCliErrorInfo(
        new CMError('FILE_NOT_FOUND', `Audio file not found: ${options.audio}`, {
          path: options.audio,
        })
      );
      addPreflightCheck(checks, {
        label: 'Audio input',
        status: shouldWarnMissing('audio', info) ? 'warn' : 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix ?? 'Provide a valid audio file path',
      });
    }
  }

  if (options.timestamps) {
    try {
      const rawTimestamps = await readInputFile(options.timestamps);
      const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
      if (!parsedTimestamps.success) {
        addPreflightCheck(checks, {
          label: 'Timestamps input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid timestamps JSON',
          fix: 'Generate timestamps via `cm timestamps --audio <path>`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Timestamps input',
          status: 'ok',
          detail: options.timestamps,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Timestamps input',
        status: shouldWarnMissing('timestamps', info) ? 'warn' : 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (options.audioMix && !options.audio) {
    addPreflightCheck(checks, {
      label: 'Audio mix output',
      status: 'ok',
      detail: options.audioMix,
    });
  } else if (options.audioMix) {
    try {
      const rawMix = await readInputFile(options.audioMix);
      const parsedMix = AudioMixOutputSchema.safeParse(rawMix);
      if (!parsedMix.success) {
        addPreflightCheck(checks, {
          label: 'Audio mix input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid audio mix JSON',
          fix: 'Generate via `cm audio --input script.json --audio-mix audio.mix.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Audio mix input',
          status: 'ok',
          detail: options.audioMix,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Audio mix input',
        status: shouldWarnMissing('audioMix', info) ? 'warn' : 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (options.visuals) {
    try {
      const rawVisuals = await readInputFile(options.visuals);
      const parsedVisuals = VisualsOutputSchema.safeParse(rawVisuals);
      if (!parsedVisuals.success) {
        addPreflightCheck(checks, {
          label: 'Visuals input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid visuals JSON',
          fix: 'Generate visuals via `cm visuals --input timestamps.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Visuals input',
          status: 'ok',
          detail: options.visuals,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Visuals input',
        status: shouldWarnMissing('visuals', info) ? 'warn' : 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  const gameplayRequired = Boolean(options.gameplayStrict) || Boolean(templateGameplay?.required);
  if (gameplayRequired && !options.gameplay) {
    addPreflightCheck(checks, {
      label: 'Gameplay asset',
      status: 'fail',
      code: 'FILE_NOT_FOUND',
      detail: 'Gameplay is required but no path provided',
      fix: 'Provide --gameplay <path> or choose a template without required gameplay',
    });
  } else if (options.gameplay) {
    addPreflightCheck(checks, {
      label: 'Gameplay asset',
      status: existsSync(options.gameplay) ? 'ok' : 'fail',
      code: existsSync(options.gameplay) ? undefined : 'FILE_NOT_FOUND',
      detail: options.gameplay,
      fix: existsSync(options.gameplay)
        ? undefined
        : 'Provide a valid gameplay directory or clip path',
    });
  }

  if (options.hook !== undefined) {
    try {
      const hook = await resolveHookFromCli(options);
      addPreflightCheck(checks, {
        label: 'Hook clip',
        status: 'ok',
        detail: hook ? hook.path : 'disabled',
      });
    } catch (error) {
      const info = getCliErrorInfo(error);
      const code = info.code === 'NOT_FOUND' ? 'FILE_NOT_FOUND' : info.code;
      addPreflightCheck(checks, {
        label: 'Hook clip',
        status: 'fail',
        code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (!options.mock) {
    let requireWhisper = options.pipeline === 'audio-first';
    let whisperModel = options.whisperModel ?? 'base';
    try {
      const config = loadConfig();
      requireWhisper = requireWhisper || config.sync.requireWhisper;
      if (!options.whisperModel) whisperModel = config.sync.asrModel;
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Config',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }

    if (requireWhisper) {
      try {
        const requirements = planWhisperRequirements({ required: true, model: whisperModel });
        const results = await evaluateRequirements(requirements);
        for (const result of results) {
          addPreflightCheck(checks, {
            label: result.label,
            status: result.ok ? 'ok' : 'fail',
            code: result.ok ? undefined : 'DEPENDENCY_MISSING',
            detail: result.detail,
            fix: result.fix,
          });
        }
      } catch (error) {
        const info = getCliErrorInfo(error);
        addPreflightCheck(checks, {
          label: 'Whisper',
          status: 'fail',
          code: info.code,
          detail: info.message,
          fix: info.fix,
        });
      }
    }
  }

  const needsScript = !options.script;
  const needsVisuals = !options.visuals;
  const needsLlm = !options.mock && (needsScript || needsVisuals);
  const needsVisualsProvider = !options.mock && needsVisuals;

  if (options.mock) {
    addPreflightCheck(checks, {
      label: 'Mock mode',
      status: 'ok',
      detail: 'Mock providers enabled (skipping API key checks)',
    });
  } else if (needsLlm) {
    let config: any | null = null;
    try {
      config = await loadConfig();
      const provider = config.llm.provider;
      const facts = LLM_PROVIDERS.find((p) => p.id === provider);
      const keys = facts?.envVarNames ?? [];
      const hasKey = keys.length > 0 && keys.some((k) => Boolean(process.env[k]));
      const keyLabel =
        keys.length === 1
          ? String(keys[0] ?? '')
          : `${String(keys[0] ?? '')} (or ${keys.slice(1).join(', ')})`;

      if (!hasKey) {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'fail',
          code: 'CONFIG_ERROR',
          detail: `${provider} (${keyLabel} missing)`,
          fix: `Set ${keyLabel} in your environment or .env file`,
        });
      } else {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'ok',
          detail: `${provider} (API key set)`,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'LLM provider',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  } else {
    addPreflightCheck(checks, {
      label: 'LLM provider',
      status: 'ok',
      detail: 'Skipped (external script/visuals provided)',
    });
  }

  if (needsVisualsProvider) {
    try {
      const config = await loadConfig();
      const provider = config.visuals?.provider ?? 'pexels';
      const facts = VISUALS_PROVIDERS.find((p) => p.id === provider);
      const keys = facts?.envVarNames ?? [];
      const hasKey = keys.length === 0 ? true : keys.some((k) => Boolean(process.env[k]));
      const keyLabel =
        keys.length === 0
          ? 'no API key required'
          : keys.length === 1
            ? String(keys[0] ?? '')
            : `${String(keys[0] ?? '')} (or ${keys.slice(1).join(', ')})`;

      if (!hasKey) {
        addPreflightCheck(checks, {
          label: 'Visuals provider',
          status: 'fail',
          code: 'CONFIG_ERROR',
          detail: `${provider} (${keyLabel} missing)`,
          fix: `Set ${keyLabel} in your environment or .env file`,
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Visuals provider',
          status: 'ok',
          detail: `${provider} (${keyLabel})`,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Visuals provider',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  } else if (!options.mock) {
    addPreflightCheck(checks, {
      label: 'Visuals provider',
      status: 'ok',
      detail: 'Skipped (external visuals provided)',
    });
  }

  if (options.syncQualityCheck) {
    try {
      parseMinSyncRating(options);
      addPreflightCheck(checks, {
        label: 'Sync quality',
        status: 'ok',
        detail: `min rating ${options.minSyncRating ?? '75'}`,
      });
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Sync quality',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  const failures = checks.filter((check) => check.status === 'fail');
  const passed = failures.length === 0;
  const exitCode = passed
    ? 0
    : failures.some((failure) => failure.code && PREFLIGHT_USAGE_CODES.has(failure.code))
      ? 2
      : 1;

  return { passed, checks, exitCode };
}

function writePreflightOutput(params: {
  topic: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  checks: PreflightCheck[];
  passed: boolean;
  exitCode: number;
}): void {
  const { topic, options, runtime, templateSpec, resolvedTemplateId, checks, passed, exitCode } =
    params;

  if (runtime.json) {
    const errors = passed
      ? []
      : checks
          .filter((check) => check.status === 'fail')
          .map((check) => {
            const context: Record<string, unknown> = { label: check.label };
            if (check.detail) context.detail = check.detail;
            if (check.fix) context.fix = check.fix;
            return {
              code: check.code ?? 'PREFLIGHT_FAILED',
              message: check.detail ? `${check.label}: ${check.detail}` : `${check.label} failed`,
              context,
            };
          });
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'generate',
        args: {
          ...buildGenerateSuccessJsonArgs({
            topic,
            archetype: options.archetype,
            orientation: options.orientation,
            options,
            templateSpec,
            resolvedTemplateId,
          }),
          preflight: true,
        },
        outputs: {
          preflightPassed: passed,
          checks,
        },
        errors,
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exit(exitCode);
  }

  writeStderrLine(passed ? 'Preflight: OK' : 'Preflight: FAILED');
  for (const check of checks) {
    writeStderrLine(formatPreflightLine(check));
    if (check.status === 'fail' && check.fix) {
      writeStderrLine(`  Fix: ${check.fix}`);
    }
  }
  if (passed) {
    writeStderrLine(`Next: cm generate "${topic}" -o ${options.output}`);
  }
  process.exit(exitCode);
}

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFontWeight(value: string | undefined): number | 'normal' | 'bold' | 'black' | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (raw === 'normal' || raw === 'bold' || raw === 'black') {
    return raw as 'normal' | 'bold' | 'black';
  }
  const numeric = Number.parseInt(raw, 10);
  if (Number.isFinite(numeric)) return numeric;
  throw new CMError('INVALID_ARGUMENT', `Invalid --caption-font-weight value: ${raw}`, {
    fix: 'Use normal, bold, black, or a numeric weight (100-900)',
  });
}

function parseWordList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
}

function normalizeWhisperModelForSync(
  model: GenerateOptions['whisperModel'] | undefined
): SyncAttemptSettings['whisperModel'] {
  if (!model) return 'base';
  if (model === 'large') return 'medium';
  return model;
}

function collectList(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parseSfxPlacement(
  value: string | undefined
): 'hook' | 'scene' | 'list-item' | 'cta' | null {
  if (!value) return null;
  const raw = value.trim();
  if (raw === 'hook' || raw === 'scene' || raw === 'list-item' || raw === 'cta') {
    return raw;
  }
  throw new CMError('INVALID_ARGUMENT', `Invalid --sfx-at value: ${raw}`, {
    fix: 'Use one of: hook, scene, list-item, cta',
  });
}

function buildAudioMixOptions(options: GenerateOptions): AudioMixPlanOptions {
  const config = loadConfig();
  const noMusic = options.music === false;
  const noSfx = options.sfx === false;
  const noAmbience = options.ambience === false;
  const sfxInputs = Array.isArray(options.sfx) ? options.sfx : [];
  const musicInput = typeof options.music === 'string' ? options.music : undefined;
  const ambienceInput = typeof options.ambience === 'string' ? options.ambience : undefined;

  return {
    mixPreset: (options.mixPreset as string | undefined) ?? config.audioMix.preset,
    lufsTarget: parseOptionalNumber(options.lufsTarget) ?? config.audioMix.lufsTarget,
    music: noMusic ? null : (musicInput ?? config.music.default ?? null),
    musicVolumeDb: parseOptionalNumber(options.musicVolume) ?? config.music.volumeDb,
    musicDuckDb: parseOptionalNumber(options.musicDuck) ?? config.music.duckDb,
    musicLoop: options.musicLoop !== undefined ? Boolean(options.musicLoop) : config.music.loop,
    musicFadeInMs: parseOptionalInt(options.musicFadeIn) ?? config.music.fadeInMs,
    musicFadeOutMs: parseOptionalInt(options.musicFadeOut) ?? config.music.fadeOutMs,
    sfx: noSfx ? [] : sfxInputs,
    sfxPack: noSfx ? null : (options.sfxPack ?? config.sfx.pack ?? null),
    sfxAt: parseSfxPlacement(options.sfxAt) ?? config.sfx.placement,
    sfxVolumeDb: parseOptionalNumber(options.sfxVolume) ?? config.sfx.volumeDb,
    sfxMinGapMs: parseOptionalInt(options.sfxMinGap) ?? config.sfx.minGapMs,
    sfxDurationSeconds: parseOptionalNumber(options.sfxDuration) ?? config.sfx.durationSeconds,
    ambience: noAmbience ? null : (ambienceInput ?? config.ambience.default ?? null),
    ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume) ?? config.ambience.volumeDb,
    ambienceLoop:
      options.ambienceLoop !== undefined ? Boolean(options.ambienceLoop) : config.ambience.loop,
    ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn) ?? config.ambience.fadeInMs,
    ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut) ?? config.ambience.fadeOutMs,
    noMusic,
    noSfx,
    noAmbience,
  };
}

function buildGenerateSuccessJsonArgs(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
}): Record<string, unknown> {
  const { topic, archetype, orientation, options, templateSpec, resolvedTemplateId } = params;

  return {
    topic,
    archetype,
    orientation,
    template: templateSpec,
    resolvedTemplateId,
    workflow: options.workflow ?? null,
    workflowAllowExec: Boolean(options.workflowAllowExec),
    script: options.script ?? null,
    audio: options.audio ?? null,
    audioMix: options.audioMix ?? null,
    timestamps: options.timestamps ?? null,
    visuals: options.visuals ?? null,
    gameplay: options.gameplay ?? null,
    gameplayStyle: options.gameplayStyle ?? null,
    gameplayStrict: Boolean(options.gameplayStrict),
    fps: options.fps,
    captionPreset: options.captionPreset,
    captionMode: options.captionMode ?? null,
    wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
    captionMaxWords: parseOptionalInt(options.captionMaxWords),
    captionMinWords: parseOptionalInt(options.captionMinWords),
    captionTargetWords: parseOptionalInt(options.captionTargetWords),
    captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
    captionMaxCps: parseOptionalNumber(options.captionMaxCps),
    captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
    captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
    captionDropFillers: options.captionDropFillers ?? null,
    captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
    voice: options.voice,
    durationSeconds: options.duration,
    output: options.output,
    keepArtifacts: options.keepArtifacts,
    music: typeof options.music === 'string' ? options.music : null,
    musicVolumeDb: parseOptionalNumber(options.musicVolume),
    musicDuckDb: parseOptionalNumber(options.musicDuck),
    musicLoop: options.musicLoop ?? null,
    musicFadeInMs: parseOptionalInt(options.musicFadeIn),
    musicFadeOutMs: parseOptionalInt(options.musicFadeOut),
    sfx: Array.isArray(options.sfx) ? options.sfx : null,
    sfxPack: options.sfxPack ?? null,
    sfxAt: parseSfxPlacement(options.sfxAt) ?? null,
    sfxVolumeDb: parseOptionalNumber(options.sfxVolume),
    sfxMinGapMs: parseOptionalInt(options.sfxMinGap),
    sfxDurationSeconds: parseOptionalNumber(options.sfxDuration),
    ambience: typeof options.ambience === 'string' ? options.ambience : null,
    ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume),
    ambienceLoop: options.ambienceLoop ?? null,
    ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn),
    ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut),
    mixPreset: options.mixPreset ?? null,
    lufsTarget: parseOptionalNumber(options.lufsTarget),
    mock: options.mock,
    pipeline: options.pipeline,
    whisperModel: options.whisperModel ?? null,
    reconcile: Boolean(options.reconcile),
    syncPreset: options.syncPreset,
    syncQualityCheck: Boolean(options.syncQualityCheck),
    minSyncRating: parseOptionalInt(options.minSyncRating),
    autoRetrySync: Boolean(options.autoRetrySync),
    captionQualityCheck: Boolean(options.captionQualityCheck),
    minCaptionOverall: parseMinCaptionOverall(options),
    autoRetryCaptions: Boolean(options.autoRetryCaptions),
    maxCaptionRetries: parseMaxCaptionRetries(options),
    captionPerfect: Boolean(options.captionPerfect),
    captionQualityMock: Boolean(options.captionQualityMock),
    gameplayPosition: options.gameplayPosition ?? null,
    contentPosition: options.contentPosition ?? null,
    splitLayout: options.splitLayout ?? null,
    hook: options.hook ?? null,
    hookLibrary: options.hookLibrary ?? null,
    hooksDir: options.hooksDir ?? null,
    hookDuration: options.hookDuration ?? null,
    hookTrim: options.hookTrim ?? null,
    hookAudio: options.hookAudio ?? null,
    hookFit: options.hookFit ?? null,
    downloadHook: Boolean(options.downloadHook),
    downloadAssets: options.downloadAssets !== false,
  };
}

function buildGenerateSuccessJsonSyncOutputs(
  sync: SyncQualitySummary | null | undefined
): Record<string, unknown> {
  if (!sync) {
    return {
      syncReportPath: null,
      syncRating: null,
      syncRatingLabel: null,
      syncPassed: null,
      syncMeanDriftMs: null,
      syncMaxDriftMs: null,
      syncMatchRatio: null,
      syncErrorCount: null,
      syncAttempts: null,
    };
  }

  return {
    syncReportPath: sync.reportPath,
    syncRating: sync.rating,
    syncRatingLabel: sync.ratingLabel,
    syncPassed: sync.passed,
    syncMeanDriftMs: sync.meanDriftMs,
    syncMaxDriftMs: sync.maxDriftMs,
    syncMatchRatio: sync.matchRatio,
    syncErrorCount: sync.errorCount,
    syncAttempts: sync.attempts,
  };
}

function buildGenerateSuccessJsonCaptionOutputs(
  caption: CaptionQualitySummary | null | undefined
): Record<string, unknown> {
  if (!caption) {
    return {
      captionReportPath: null,
      captionOverallScore: null,
      captionPassed: null,
      captionCoverageRatio: null,
      captionSafeAreaScore: null,
      captionFlickerEvents: null,
      captionMeanOcrConfidence: null,
      captionAttempts: null,
    };
  }

  return {
    captionReportPath: caption.reportPath,
    captionOverallScore: caption.overallScore,
    captionPassed: caption.passed,
    captionCoverageRatio: caption.coverageRatio,
    captionSafeAreaScore: caption.safeAreaScore,
    captionFlickerEvents: caption.flickerEvents,
    captionMeanOcrConfidence: caption.meanOcrConfidence,
    captionAttempts: caption.attempts,
  };
}

function buildGenerateSuccessJsonOutputs(params: {
  result: PipelineResult;
  artifactsDir: string;
  sync: SyncQualitySummary | null | undefined;
  caption: CaptionQualitySummary | null | undefined;
}): Record<string, unknown> {
  const { result, artifactsDir, sync, caption } = params;

  return {
    videoPath: result.outputPath,
    durationSeconds: result.duration,
    width: result.width,
    height: result.height,
    fps: result.render.fps,
    fileSizeBytes: result.fileSize,
    artifactsDir,
    costs: result.costs ?? null,
    audioMixPath: result.audio.audioMixPath ?? null,
    audioMixLayers: result.audio.audioMix?.layers.length ?? 0,
    gameplayClip: result.visuals.gameplayClip?.path ?? null,
    ...buildGenerateSuccessJsonSyncOutputs(sync),
    ...buildGenerateSuccessJsonCaptionOutputs(caption),
  };
}

function writeSuccessJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
  sync?: SyncQualitySummary | null;
  caption?: CaptionQualitySummary | null;
  exitCode?: number;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
    sync,
    caption,
    exitCode = 0,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: buildGenerateSuccessJsonArgs({
        topic,
        archetype,
        orientation,
        options,
        templateSpec,
        resolvedTemplateId,
      }),
      outputs: buildGenerateSuccessJsonOutputs({ result, artifactsDir, sync, caption }),
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(exitCode);
}

function applyDefaultOption(
  options: Record<string, unknown>,
  command: Command,
  optionName: string,
  value: unknown
): void {
  if (value === undefined) return;
  const source = command.getOptionValueSource(optionName);
  if (source !== 'default' && source !== undefined) return;
  options[optionName] = value;
}

function applyQualityDefaults(options: GenerateOptions, command: Command): void {
  if (!options.quality) return;

  const record = options as unknown as Record<string, unknown>;

  // Prefer better sync defaults, but do not override explicit flags.
  applyDefaultOption(record, command, 'syncPreset', 'quality');
  applyDefaultOption(record, command, 'syncQualityCheck', true);
  applyDefaultOption(record, command, 'autoRetrySync', true);
  applyDefaultOption(record, command, 'minSyncRating', '80');

  // Prefer readable burned-in captions; keep retries bounded.
  applyDefaultOption(record, command, 'captionQualityCheck', true);
  applyDefaultOption(record, command, 'autoRetryCaptions', true);
  applyDefaultOption(record, command, 'maxCaptionRetries', '3');
  applyDefaultOption(record, command, 'minCaptionOverall', '0.80');
  applyDefaultOption(record, command, 'captionQualityMock', false);
}

function applySyncPresetDefaults(options: GenerateOptions, command: Command): void {
  const presetName = options.syncPreset ?? 'standard';
  const preset = SYNC_PRESETS[presetName];
  if (!preset) return;

  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'pipeline', preset.pipeline);
  applyDefaultOption(record, command, 'reconcile', preset.reconcile);
  applyDefaultOption(record, command, 'syncQualityCheck', preset.syncQualityCheck);
  applyDefaultOption(record, command, 'minSyncRating', String(preset.minSyncRating));
  applyDefaultOption(record, command, 'autoRetrySync', preset.autoRetrySync);
}

function applyDefaultsFromConfig(options: GenerateOptions, command: Command): void {
  const config = loadConfig();
  const record = options as unknown as Record<string, unknown>;

  // Pipeline defaults
  applyDefaultOption(record, command, 'archetype', config.defaults.archetype);
  applyDefaultOption(record, command, 'orientation', config.defaults.orientation);
  applyDefaultOption(record, command, 'voice', config.defaults.voice);
  applyDefaultOption(record, command, 'fps', String(config.render.fps));
  applyDefaultOption(record, command, 'template', config.render.template);
  applyDefaultOption(record, command, 'workflow', config.generate.workflow);

  // Caption defaults
  const captions = config.captions;
  const defaultFamily =
    captions.fonts && captions.fonts.length > 0 ? captions.fonts[0].family : captions.fontFamily;
  applyDefaultOption(record, command, 'captionFontFamily', defaultFamily);
  applyDefaultOption(record, command, 'captionFontWeight', String(captions.fontWeight));
  applyDefaultOption(record, command, 'captionFontFile', captions.fontFile);
  applyDefaultOption(record, command, 'captionPreset', captions.preset);
  if (!options.captionFonts && captions.fonts.length > 0) {
    options.captionFonts = captions.fonts;
  }
}

function applyCaptionQualityPerfectDefaults(options: GenerateOptions, command: Command): void {
  if (!options.captionPerfect) return;
  options.captionQualityCheck = true;
  options.autoRetryCaptions = true;
  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'minCaptionOverall', '0.95');
  applyDefaultOption(record, command, 'maxCaptionRetries', '50');
  applyDefaultOption(record, command, 'captionQualityMock', false);
  applyDefaultOption(record, command, 'captionMode', 'chunk');
  applyDefaultOption(record, command, 'wordsPerPage', '8');
  applyDefaultOption(record, command, 'captionGroupMs', '1200');
  applyDefaultOption(record, command, 'captionMaxWpm', '220');
  applyDefaultOption(record, command, 'captionMaxCps', '18');
  applyDefaultOption(record, command, 'captionMinOnScreenMs', '1400');
  applyDefaultOption(record, command, 'captionMinOnScreenMsShort', '1100');
}

function mergeCaptionConfigPartials(
  base: CaptionConfigInput | undefined,
  overrides: CaptionConfigInput | undefined
): CaptionConfigInput | undefined {
  if (!base) return overrides;
  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    pillStyle: { ...base.pillStyle, ...overrides.pillStyle },
    stroke: { ...base.stroke, ...overrides.stroke },
    shadow: { ...base.shadow, ...overrides.shadow },
    layout: { ...base.layout, ...overrides.layout },
    positionOffset: { ...base.positionOffset, ...overrides.positionOffset },
    safeZone: { ...base.safeZone, ...overrides.safeZone },
    cleanup: { ...base.cleanup, ...overrides.cleanup },
    listBadges: { ...(base.listBadges ?? {}), ...(overrides.listBadges ?? {}) },
    emphasis: { ...base.emphasis, ...overrides.emphasis },
  };
}

function getOptionNameMap(command: Command): Map<string, string> {
  const map = new Map<string, string>();
  for (const option of command.options) {
    const attribute = option.attributeName();
    map.set(attribute, attribute);
    if (option.long) {
      map.set(option.long.replace(/^--/, ''), attribute);
    }
  }
  return map;
}

function resolveWorkflowPath(
  baseDir: string | undefined,
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return resolve(baseDir ?? process.cwd(), value);
}

function applyWorkflowDefaults(
  options: GenerateOptions,
  command: Command,
  workflow: WorkflowDefinition | undefined,
  skipKeys: Set<string> = new Set()
): void {
  if (!workflow?.defaults) return;
  const record = options as unknown as Record<string, unknown>;
  const optionMap = getOptionNameMap(command);

  for (const [key, value] of Object.entries(workflow.defaults)) {
    const normalizedKey = optionMap.get(key) ?? optionMap.get(key.replace(/^--/, ''));
    if (!normalizedKey) continue;
    if (skipKeys.has(normalizedKey)) continue;
    applyDefaultOption(record, command, normalizedKey, value);
  }
}

function applyWorkflowInputs(
  options: GenerateOptions,
  command: Command,
  workflow: WorkflowDefinition | undefined,
  baseDir: string | undefined
): void {
  if (!workflow?.inputs) return;
  const record = options as unknown as Record<string, unknown>;
  const inputs = workflow.inputs;

  applyDefaultOption(record, command, 'script', resolveWorkflowPath(baseDir, inputs.script));
  applyDefaultOption(record, command, 'audio', resolveWorkflowPath(baseDir, inputs.audio));
  applyDefaultOption(
    record,
    command,
    'timestamps',
    resolveWorkflowPath(baseDir, inputs.timestamps)
  );
  applyDefaultOption(record, command, 'visuals', resolveWorkflowPath(baseDir, inputs.visuals));
}

type WorkflowStageId = 'script' | 'audio' | 'visuals' | 'render';
type WorkflowStageModes = Record<WorkflowStageId, WorkflowStageMode>;

function resolveWorkflowStageModes(workflow: WorkflowDefinition | undefined): WorkflowStageModes {
  const stages = workflow?.stages;
  return {
    script: resolveWorkflowStageMode(stages?.script),
    audio: resolveWorkflowStageMode(stages?.audio),
    visuals: resolveWorkflowStageMode(stages?.visuals),
    render: resolveWorkflowStageMode(stages?.render),
  };
}

function isExternalStageMode(mode: WorkflowStageMode): boolean {
  return mode !== 'builtin';
}

function applyWorkflowStageDefaults(
  options: GenerateOptions,
  stageModes: WorkflowStageModes,
  artifactsDir: string
): void {
  if (isExternalStageMode(stageModes.script)) {
    if (!options.script) {
      options.script = join(artifactsDir, 'script.json');
    }
  }
  if (isExternalStageMode(stageModes.audio)) {
    if (!options.audio) {
      options.audio = join(artifactsDir, 'audio.wav');
    }
    if (!options.timestamps) {
      options.timestamps = join(artifactsDir, 'timestamps.json');
    }
  }
  if (isExternalStageMode(stageModes.visuals)) {
    if (!options.visuals) {
      options.visuals = join(artifactsDir, 'visuals.json');
    }
  }
}

async function resolveTemplateAndApplyDefaults(
  options: GenerateOptions,
  command: Command
): Promise<{
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  templateOverlays: OverlayAsset[];
}> {
  if (!options.template) {
    return {
      resolvedTemplate: undefined,
      templateDefaults: undefined,
      templateParams: {},
      templateGameplay: null,
      templateOverlays: [],
    };
  }

  const resolvedTemplate = await resolveRenderTemplate(options.template);
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;
  const templateParams = getTemplateParams(resolvedTemplate.template);
  const templateGameplay = getTemplateGameplaySlot(resolvedTemplate.template);
  const templateFonts = getTemplateFontSources(
    resolvedTemplate.template,
    resolvedTemplate.templateDir
  );
  const templateOverlays = getTemplateOverlays(
    resolvedTemplate.template,
    resolvedTemplate.templateDir
  );

  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'archetype', templateDefaults.archetype);
  applyDefaultOption(record, command, 'orientation', templateDefaults.orientation);
  applyDefaultOption(
    record,
    command,
    'fps',
    templateDefaults.fps !== undefined ? String(templateDefaults.fps) : undefined
  );
  applyDefaultOption(record, command, 'captionPreset', templateDefaults.captionPreset);
  if (templateFonts.length > 0) {
    // Prefer template-provided fonts over config defaults unless the user explicitly overrides.
    applyDefaultOption(record, command, 'captionFontFamily', templateFonts[0]?.family);
    options.captionFonts = mergeFontSources(templateFonts, options.captionFonts ?? []);
  }

  return { resolvedTemplate, templateDefaults, templateParams, templateGameplay, templateOverlays };
}

function handleDryRun(params: {
  topic: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  archetype: Archetype;
  orientation: Orientation;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
}): boolean {
  if (!params.options.dryRun) return false;

  if (params.runtime.json) {
    writeDryRunJson({
      topic: params.topic,
      archetype: params.archetype,
      orientation: params.orientation,
      options: params.options,
      templateSpec: params.templateSpec,
      resolvedTemplateId: params.resolvedTemplateId,
      runtime: params.runtime,
      artifactsDir: params.artifactsDir,
    });
    return true;
  }

  showDryRunSummary(params.topic, params.options, params.archetype, params.orientation);
  return true;
}

async function loadExternalPipelineInputs(options: GenerateOptions): Promise<{
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}> {
  let scriptInput: ScriptOutput | undefined;
  let timestampsInput: ReturnType<typeof TimestampsOutputSchema.parse> | undefined;
  let audioMixInput: ReturnType<typeof AudioMixOutputSchema.parse> | undefined;
  let audioInput: AudioOutput | undefined;
  let visualsInput: VisualsOutput | undefined;

  if (options.script) {
    const rawScript = await readInputFile(options.script);
    const parsedScript = ScriptOutputSchema.safeParse(rawScript);
    if (!parsedScript.success) {
      throw new SchemaError('Invalid script file', {
        path: options.script,
        issues: parsedScript.error.issues,
        fix: 'Provide a valid script.json or omit --script',
      });
    }
    scriptInput = parsedScript.data;
  }

  if (options.timestamps) {
    const rawTimestamps = await readInputFile(options.timestamps);
    const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
    if (!parsedTimestamps.success) {
      throw new SchemaError('Invalid timestamps file', {
        path: options.timestamps,
        issues: parsedTimestamps.error.issues,
        fix: 'Generate timestamps via `cm timestamps --audio <path>`',
      });
    }
    timestampsInput = parsedTimestamps.data;
  }

  if (options.audio) {
    if (!options.timestamps || !timestampsInput) {
      throw new CMError('INVALID_ARGUMENT', 'Audio requires a timestamps file', {
        fix: 'Provide --timestamps alongside --audio',
      });
    }
    if (options.audioMix) {
      const rawMix = await readInputFile(options.audioMix);
      const parsedMix = AudioMixOutputSchema.safeParse(rawMix);
      if (!parsedMix.success) {
        throw new SchemaError('Invalid audio mix file', {
          path: options.audioMix,
          issues: parsedMix.error.issues,
          fix: 'Generate via `cm audio --input script.json --audio-mix audio.mix.json`',
        });
      }
      audioMixInput = parsedMix.data;
    }
    if (!existsSync(options.audio)) {
      throw new CMError('FILE_NOT_FOUND', `Audio file not found: ${options.audio}`, {
        path: options.audio,
        fix: 'Provide a valid audio file path',
      });
    }

    let audioInfo: Awaited<ReturnType<typeof probeAudioWithFfprobe>> | undefined;
    try {
      audioInfo = await probeAudioWithFfprobe(options.audio);
    } catch (error) {
      logger.warn({ error, audio: options.audio }, 'Audio probe failed, using timestamps duration');
    }

    const duration = timestampsInput.totalDuration || audioInfo?.durationSeconds;
    if (!Number.isFinite(duration)) {
      throw new CMError('INVALID_ARGUMENT', 'Unable to determine audio duration', {
        fix: 'Ensure timestamps.json includes totalDuration',
      });
    }
    const sampleRate = audioInfo?.sampleRate ?? 48000;

    const parsedAudio = AudioOutputSchema.parse({
      audioPath: options.audio,
      timestampsPath: options.timestamps,
      timestamps: timestampsInput,
      duration,
      wordCount: timestampsInput.allWords.length,
      voice: 'external',
      sampleRate,
      audioMixPath: options.audioMix,
      audioMix: audioMixInput,
    });

    audioInput = parsedAudio;
  } else if (options.timestamps) {
    throw new CMError('INVALID_ARGUMENT', 'Timestamps provided without audio', {
      fix: 'Provide --audio alongside --timestamps',
    });
  }

  if (options.visuals) {
    const rawVisuals = await readInputFile(options.visuals);
    const parsedVisuals = VisualsOutputSchema.safeParse(rawVisuals);
    if (!parsedVisuals.success) {
      throw new SchemaError('Invalid visuals file', {
        path: options.visuals,
        issues: parsedVisuals.error.issues,
        fix: 'Generate visuals via `cm visuals --input timestamps.json`',
      });
    }
    visualsInput = parsedVisuals.data;
  }

  return { scriptInput, audioInput, visualsInput };
}

function assertWorkflowStageInputs(params: {
  stageModes: WorkflowStageModes;
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}): void {
  const { stageModes, scriptInput, audioInput, visualsInput } = params;

  if (isExternalStageMode(stageModes.render)) {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Workflow render stages are not supported in cm generate',
      {
        fix: 'Remove render stage overrides or use `cm render` with your artifacts',
      }
    );
  }

  if (isExternalStageMode(stageModes.script) && !scriptInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow script stage requires an input script', {
      fix: 'Provide --script or set workflow.inputs.script',
    });
  }

  if (isExternalStageMode(stageModes.audio) && !audioInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow audio stage requires audio + timestamps', {
      fix: 'Provide --audio and --timestamps, or set workflow.inputs.audio/timestamps',
    });
  }

  if (isExternalStageMode(stageModes.visuals) && !visualsInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow visuals stage requires an input visuals file', {
      fix: 'Provide --visuals or set workflow.inputs.visuals',
    });
  }
}

function createPipelineObservation(runtime: ReturnType<typeof getCliRuntime>): {
  eventEmitter: PipelineEventEmitter | undefined;
  dispose: () => void;
} {
  if (runtime.json) {
    return { eventEmitter: undefined, dispose: () => {} };
  }

  const eventEmitter = new PipelineEventEmitter();
  const stageObserver = new CliProgressObserver(process.stderr);
  eventEmitter.subscribe({
    onEvent: (event: PipelineEvent) => {
      if (event.type.startsWith('stage:')) stageObserver.onEvent(event);
    },
  });

  return { eventEmitter, dispose: () => stageObserver.dispose() };
}

async function runGeneratePipeline(params: {
  topic: string;
  archetype: Archetype;
  orientation: Orientation;
  options: GenerateOptions;
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined;
  remotionProject: ResolvedRemotionTemplateProject | null;
  allowTemplateCode?: boolean;
  installTemplateDeps?: boolean;
  templateDepsAllowOutput?: boolean;
  templatePackageManager?: 'npm' | 'pnpm' | 'yarn';
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateOverlays: OverlayAsset[];
  gameplay?: { library?: string; style?: string; required?: boolean };
  hook?: HookClip | null;
  research: ResearchOutput | undefined;
  llmProvider: FakeLLMProvider | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}): Promise<PipelineResult> {
  const { eventEmitter, dispose } = createPipelineObservation(params.runtime);

  try {
    const { runPipeline } = await import('../../core/pipeline');
    const wordsPerPage = params.options.wordsPerPage ?? params.options.captionMaxWords ?? undefined;
    const captionFillerWords = parseWordList(params.options.captionFillerWords);
    const captionDropFillers =
      params.options.captionDropFillers || (captionFillerWords && captionFillerWords.length > 0)
        ? true
        : undefined;
    const captionDropListMarkers = params.options.captionDropListMarkers ? true : undefined;
    const captionFontWeight = parseFontWeight(params.options.captionFontWeight) ?? undefined;
    const requestedDuration = parseOptionalNumber(params.options.duration) ?? 45;
    const hookDuration = params.hook?.duration ?? 0;
    const targetDuration =
      !params.scriptInput && hookDuration > 0
        ? Math.max(1, requestedDuration - hookDuration)
        : requestedDuration;
    if (!params.scriptInput && hookDuration > 0 && targetDuration !== requestedDuration) {
      logger.info(
        { requestedDuration, hookDuration, targetDuration },
        'Adjusted script target duration to account for hook'
      );
    }
    const mixOptions = buildAudioMixOptions(params.options);
    const hasMixSources = hasAudioMixSources(mixOptions);
    const artifactsDir = dirname(params.options.output);
    const audioMixOutputPath = params.options.audioMix ?? join(artifactsDir, 'audio.mix.json');
    const audioMixRequest =
      params.audioInput || (!hasMixSources && !params.options.audioMix)
        ? undefined
        : {
            outputPath: audioMixOutputPath,
            options: mixOptions,
            emitEmpty: Boolean(params.options.audioMix) && !hasMixSources,
          };

    const mockRenderMode: 'placeholder' | 'real' | undefined =
      params.options.mock &&
      (params.options.captionPerfect || params.options.captionQualityCheck) &&
      !params.options.captionQualityMock
        ? 'real'
        : undefined;

    const config = loadConfig();
    const mergedCaptionConfig = mergeCaptionConfigPartials(
      config.captions.config as CaptionConfigInput | undefined,
      (params.templateDefaults?.captionConfig as CaptionConfigInput | undefined) ?? undefined
    );

    return await runPipeline({
      topic: params.topic,
      archetype: params.archetype as Archetype,
      orientation: params.orientation as 'portrait' | 'landscape' | 'square',
      voice: params.options.voice,
      targetDuration,
      outputPath: params.options.output,
      fps: params.options.fps ? parseInt(params.options.fps, 10) : undefined,
      compositionId: params.resolvedTemplate?.template.compositionId,
      allowTemplateCode: params.allowTemplateCode,
      installTemplateDeps: params.installTemplateDeps,
      templateDepsAllowOutput: params.templateDepsAllowOutput,
      templatePackageManager: params.templatePackageManager,
      remotionEntryPoint: params.remotionProject?.entryPoint,
      remotionRootDir: params.remotionProject?.rootDir,
      remotionPublicDir: params.remotionProject?.publicDir,
      templateId: params.resolvedTemplate?.template.id,
      templateSource: params.resolvedTemplate
        ? formatTemplateSource(params.resolvedTemplate)
        : undefined,
      templateParams: (params.resolvedTemplate?.template.params ?? undefined) as
        | Record<string, unknown>
        | undefined,
      overlays: params.templateOverlays.length > 0 ? params.templateOverlays : undefined,
      captionPreset: params.options.captionPreset as CaptionPresetName | undefined,
      captionConfig: mergedCaptionConfig,
      keepArtifacts: params.options.keepArtifacts,
      llmProvider: params.llmProvider,
      mock: params.options.mock,
      mockRenderMode,
      research: params.research,
      eventEmitter,
      pipelineMode: params.options.pipeline ?? 'standard',
      whisperModel: params.options.whisperModel,
      hook: params.hook ?? undefined,
      captionGroupMs: params.options.captionGroupMs
        ? parseInt(params.options.captionGroupMs, 10)
        : undefined,
      reconcile: params.options.reconcile,
      captionMode: params.options.captionMode,
      wordsPerPage: wordsPerPage ? parseInt(wordsPerPage, 10) : undefined,
      captionMinWords: parseOptionalInt(params.options.captionMinWords) ?? undefined,
      captionTargetWords: parseOptionalInt(params.options.captionTargetWords) ?? undefined,
      captionMaxWpm: parseOptionalNumber(params.options.captionMaxWpm) ?? undefined,
      captionMaxCps: parseOptionalNumber(params.options.captionMaxCps) ?? undefined,
      captionMinOnScreenMs: parseOptionalInt(params.options.captionMinOnScreenMs) ?? undefined,
      captionMinOnScreenMsShort:
        parseOptionalInt(params.options.captionMinOnScreenMsShort) ?? undefined,
      captionDropFillers,
      captionDropListMarkers,
      captionFillerWords,
      captionFontFamily: params.options.captionFontFamily ?? undefined,
      captionFontWeight,
      captionFontFile: params.options.captionFontFile ?? undefined,
      captionFonts: params.options.captionFonts,
      maxLinesPerPage: params.options.maxLines ? parseInt(params.options.maxLines, 10) : undefined,
      maxCharsPerLine: params.options.charsPerLine
        ? parseInt(params.options.charsPerLine, 10)
        : undefined,
      captionAnimation: params.options.captionAnimation,
      captionWordAnimation: params.options.captionWordAnimation,
      captionWordAnimationMs: parseOptionalInt(params.options.captionWordAnimationMs) ?? undefined,
      captionWordAnimationIntensity:
        parseOptionalNumber(params.options.captionWordAnimationIntensity) ?? undefined,
      captionOffsetMs: parseOptionalInt(params.options.captionOffsetMs) ?? undefined,
      gameplay: params.gameplay,
      splitScreenRatio: params.templateParams.splitScreenRatio,
      gameplayPosition: params.options.gameplayPosition ?? params.templateParams.gameplayPosition,
      contentPosition: params.options.contentPosition ?? params.templateParams.contentPosition,
      downloadAssets: params.options.downloadAssets !== false,
      audioMix: audioMixRequest,
      scriptInput: params.scriptInput,
      audioInput: params.audioInput,
      visualsInput: params.visualsInput,
    });
  } finally {
    dispose();
  }
}

function toNullableString(value: string | undefined): string | null {
  return value ?? null;
}

function resolveTemplateId(
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined
): string | null {
  return resolvedTemplate?.template.id ?? null;
}

function getTemplateSourceForLog(
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined
): string | undefined {
  return resolvedTemplate ? formatTemplateSource(resolvedTemplate) : undefined;
}

function getLogFps(options: GenerateOptions): number {
  return options.fps ? parseInt(options.fps, 10) : 30;
}

function getCaptionPreset(options: GenerateOptions): string {
  return options.captionPreset ?? 'capcut';
}

function parseLayoutPosition(
  value: unknown,
  optionName: string
): 'top' | 'bottom' | 'full' | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'top' || raw === 'bottom' || raw === 'full') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid ${optionName} value: ${raw}`, {
    fix: `Use one of: top, bottom, full for ${optionName}`,
  });
}

function parseSplitLayoutPreset(
  value: unknown
):
  | { gameplayPosition: 'top' | 'bottom' | 'full'; contentPosition: 'top' | 'bottom' | 'full' }
  | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'gameplay-top') return { gameplayPosition: 'top', contentPosition: 'bottom' };
  if (raw === 'gameplay-bottom') return { gameplayPosition: 'bottom', contentPosition: 'top' };
  throw new CMError('INVALID_ARGUMENT', `Invalid --split-layout value: ${raw}`, {
    fix: 'Use one of: gameplay-top, gameplay-bottom',
  });
}

function reportResearchSummary(
  research: ResearchOutput | undefined,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (!research || runtime.json) return;

  writeStderrLine(
    chalk.gray(
      `Research: ${research.totalResults} evidence items from ${research.sources.join(', ')}`
    )
  );
}

function createGenerateLlmProvider(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): FakeLLMProvider | undefined {
  if (!options.mock) return undefined;
  if (!runtime.json) writeStderrLine(chalk.yellow('Mock mode - using fake providers'));
  return createMockLLMProvider(topic);
}

function parseMinSyncRating(options: GenerateOptions): number {
  const raw = options.minSyncRating ?? '75';
  const minRating = Number.parseInt(raw, 10);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-sync-rating value: ${raw}`, {
      fix: 'Use a number between 0 and 100 for --min-sync-rating',
    });
  }
  return minRating;
}

function parseMinCaptionOverall(options: GenerateOptions): number {
  const raw = options.minCaptionOverall ?? '0.75';
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-caption-overall value: ${raw}`, {
      fix: 'Use a number between 0 and 1 (or 0 and 100) for --min-caption-overall',
    });
  }
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-caption-overall value: ${raw}`, {
      fix: 'Use a number between 0 and 1 (or 0 and 100) for --min-caption-overall',
    });
  }
  return normalized;
}

function parseMaxCaptionRetries(options: GenerateOptions): number {
  const raw = options.maxCaptionRetries ?? '2';
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --max-caption-retries value: ${raw}`, {
      fix: 'Use a number between 0 and 100 for --max-caption-retries',
    });
  }
  return value;
}

function buildSyncQualitySummary(
  reportPath: string,
  rating: SyncRatingOutput,
  attempts: number
): SyncQualitySummary {
  return {
    reportPath,
    rating: rating.rating,
    ratingLabel: rating.ratingLabel,
    passed: rating.passed,
    meanDriftMs: rating.metrics.meanDriftMs,
    maxDriftMs: rating.metrics.maxDriftMs,
    matchRatio: rating.metrics.matchRatio,
    errorCount: rating.errors.length,
    attempts,
  };
}

interface CaptionQualitySummary {
  reportPath: string;
  overallScore: number;
  passed: boolean;
  coverageRatio: number;
  safeAreaScore: number;
  flickerEvents: number;
  meanOcrConfidence: number;
  attempts: number;
}

function buildCaptionQualitySummary(
  reportPath: string,
  rating: CaptionQualityRatingOutput,
  attempts: number,
  minOverallScore: number
): CaptionQualitySummary {
  const passed =
    rating.captionQuality.overall.passed && rating.captionQuality.overall.score >= minOverallScore;
  return {
    reportPath,
    overallScore: rating.captionQuality.overall.score,
    passed,
    coverageRatio: rating.captionQuality.coverage.coverageRatio,
    safeAreaScore: rating.captionQuality.safeArea.score,
    flickerEvents: rating.captionQuality.flicker.flickerEvents,
    meanOcrConfidence: rating.captionQuality.ocrConfidence.mean,
    attempts,
  };
}

function mergeTemplateDefaultsCaptionConfig(
  templateDefaults: Record<string, unknown> | undefined,
  overrides: CaptionConfigInput
): Record<string, unknown> | undefined {
  if (!overrides || Object.keys(overrides).length === 0) return templateDefaults;
  const base = (templateDefaults?.captionConfig ?? {}) as CaptionConfigInput;
  const merged: CaptionConfigInput = {
    ...base,
    ...overrides,
    pillStyle: { ...(base.pillStyle ?? {}), ...(overrides.pillStyle ?? {}) },
    stroke: { ...(base.stroke ?? {}), ...(overrides.stroke ?? {}) },
    shadow: { ...(base.shadow ?? {}), ...(overrides.shadow ?? {}) },
    layout: { ...(base.layout ?? {}), ...(overrides.layout ?? {}) },
    positionOffset: { ...(base.positionOffset ?? {}), ...(overrides.positionOffset ?? {}) },
    safeZone: { ...(base.safeZone ?? {}), ...(overrides.safeZone ?? {}) },
    emphasis: { ...(base.emphasis ?? {}), ...(overrides.emphasis ?? {}) },
    cleanup: { ...(base.cleanup ?? {}), ...(overrides.cleanup ?? {}) },
  };

  return { ...(templateDefaults ?? {}), captionConfig: merged };
}

type GeneratePipelineWithQualityGateParams = Parameters<typeof runGeneratePipeline>[0] & {
  artifactsDir: string;
};

interface GeneratePipelineWithQualityGateResult {
  result: PipelineResult;
  finalOptions: GenerateOptions;
  sync: SyncQualitySummary | null;
  caption: CaptionQualitySummary | null;
  exitCode: number;
}

async function runPipelineWithOptionalSyncQualityGate(
  params: GeneratePipelineWithQualityGateParams
): Promise<GeneratePipelineWithQualityGateResult> {
  let result: PipelineResult;
  let finalOptions: GenerateOptions = params.options;
  let sync: SyncQualitySummary | null = null;
  let caption: CaptionQualitySummary | null = null;
  let exitCode = 0;

  if (!params.options.syncQualityCheck) {
    result = await runGeneratePipeline(params);
  } else {
    const minRating = parseMinSyncRating(params.options);
    const initialSettings: SyncAttemptSettings = {
      pipelineMode: params.options.pipeline ?? 'standard',
      reconcile: Boolean(params.options.reconcile),
      whisperModel: normalizeWhisperModelForSync(params.options.whisperModel),
    };

    const autoRetryRequested = Boolean(params.options.autoRetrySync);
    const autoRetry = params.audioInput ? false : autoRetryRequested;
    const config = {
      enabled: true,
      autoRetry,
      maxRetries: autoRetry ? 1 : 0,
    };

    const { rateSyncQuality } = await import('../../score/sync-rater');

    const runAttempt = async (settings: SyncAttemptSettings): Promise<PipelineResult> => {
      const attemptOptions: GenerateOptions = {
        ...params.options,
        pipeline: settings.pipelineMode,
        reconcile: settings.reconcile,
        whisperModel: settings.whisperModel,
      };

      const llmProvider = params.options.mock
        ? createMockLLMProvider(params.topic)
        : params.llmProvider;
      return runGeneratePipeline({ ...params, options: attemptOptions, llmProvider });
    };

    const rate = (videoPath: string): Promise<SyncRatingOutput> => {
      return rateSyncQuality(videoPath, {
        fps: 2,
        thresholds: {
          minRating,
          maxMeanDriftMs: 180,
          maxMaxDriftMs: 500,
          minMatchRatio: 0.7,
        },
        asrModel: normalizeWhisperModelForSync(params.options.whisperModel),
        mock: params.options.mock,
      });
    };

    const outcome = await runGenerateWithSyncQualityGate({
      initialSettings,
      config,
      runAttempt,
      rate,
    });

    result = outcome.pipelineResult;

    const rating = outcome.rating;
    if (rating) {
      const reportPath = await writeSyncQualityReportFiles(
        params.artifactsDir,
        rating,
        outcome.attemptHistory
      );
      sync = buildSyncQualitySummary(reportPath, rating, outcome.attempts);
      if (!sync.passed) exitCode = 1;
    }

    finalOptions = {
      ...params.options,
      pipeline: outcome.finalSettings.pipelineMode,
      reconcile: outcome.finalSettings.reconcile,
      whisperModel: outcome.finalSettings.whisperModel,
    };
  }

  if (params.options.captionQualityCheck) {
    const minOverallScore = parseMinCaptionOverall(params.options);
    const autoRetry = Boolean(params.options.autoRetryCaptions);
    const config = {
      enabled: true,
      autoRetry,
      maxRetries: autoRetry ? parseMaxCaptionRetries(params.options) : 0,
      minOverallScore,
    };

    const baseInputs = {
      scriptInput: result.script,
      audioInput: result.audio,
      visualsInput: result.visuals,
    };

    const wordsPerPage = finalOptions.wordsPerPage ?? finalOptions.captionMaxWords;

    const initialCaptionSettings: CaptionAttemptSettings = {
      captionPreset: finalOptions.captionPreset as CaptionPresetName | undefined,
      captionMode: finalOptions.captionMode ?? undefined,
      wordsPerPage: wordsPerPage ? parseInt(wordsPerPage, 10) : undefined,
      captionTargetWords: parseOptionalInt(finalOptions.captionTargetWords) ?? undefined,
      captionMinWords: parseOptionalInt(finalOptions.captionMinWords) ?? undefined,
      captionMaxWpm: parseOptionalNumber(finalOptions.captionMaxWpm) ?? undefined,
      captionGroupMs: finalOptions.captionGroupMs
        ? parseInt(finalOptions.captionGroupMs, 10)
        : undefined,
      captionConfigOverrides: {},
      maxLinesPerPage: finalOptions.maxLines ? parseInt(finalOptions.maxLines, 10) : undefined,
      maxCharsPerLine: finalOptions.charsPerLine
        ? parseInt(finalOptions.charsPerLine, 10)
        : undefined,
      captionMaxCps: parseOptionalNumber(finalOptions.captionMaxCps) ?? undefined,
      captionMinOnScreenMs: parseOptionalInt(finalOptions.captionMinOnScreenMs) ?? undefined,
      captionMinOnScreenMsShort:
        parseOptionalInt(finalOptions.captionMinOnScreenMsShort) ?? undefined,
    };

    const { rateCaptionQuality } = await import('../../score/sync-rater');

    const rerender = async (settings: CaptionAttemptSettings): Promise<PipelineResult> => {
      const attemptOptions: GenerateOptions = { ...finalOptions };
      if (settings.captionPreset) attemptOptions.captionPreset = settings.captionPreset;
      if (settings.captionMode) attemptOptions.captionMode = settings.captionMode;
      if (settings.wordsPerPage !== undefined)
        attemptOptions.wordsPerPage = String(settings.wordsPerPage);
      if (settings.captionTargetWords !== undefined)
        attemptOptions.captionTargetWords = String(settings.captionTargetWords);
      if (settings.captionMinWords !== undefined)
        attemptOptions.captionMinWords = String(settings.captionMinWords);
      if (settings.captionMaxWpm !== undefined)
        attemptOptions.captionMaxWpm = String(settings.captionMaxWpm);
      if (settings.captionGroupMs !== undefined)
        attemptOptions.captionGroupMs = String(settings.captionGroupMs);
      if (settings.maxLinesPerPage !== undefined)
        attemptOptions.maxLines = String(settings.maxLinesPerPage);
      if (settings.maxCharsPerLine !== undefined)
        attemptOptions.charsPerLine = String(settings.maxCharsPerLine);
      if (settings.captionMaxCps !== undefined)
        attemptOptions.captionMaxCps = String(settings.captionMaxCps);
      if (settings.captionMinOnScreenMs !== undefined) {
        attemptOptions.captionMinOnScreenMs = String(settings.captionMinOnScreenMs);
      }
      if (settings.captionMinOnScreenMsShort !== undefined) {
        attemptOptions.captionMinOnScreenMsShort = String(settings.captionMinOnScreenMsShort);
      }

      const templateDefaults = mergeTemplateDefaultsCaptionConfig(
        params.templateDefaults,
        settings.captionConfigOverrides
      );

      const llmProvider = params.options.mock
        ? createMockLLMProvider(params.topic)
        : params.llmProvider;

      return runGeneratePipeline({
        ...params,
        options: attemptOptions,
        templateDefaults,
        llmProvider,
        ...baseInputs,
      });
    };

    const rate = (videoPath: string): Promise<CaptionQualityRatingOutput> => {
      return rateCaptionQuality(videoPath, {
        fps: 2,
        captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
        mock: Boolean(params.options.captionQualityMock),
      });
    };

    const outcome = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: result,
      initialSettings: initialCaptionSettings,
      config,
      rerender,
      rate,
    });

    result = outcome.pipelineResult;

    const rating = outcome.rating;
    if (rating) {
      const reportPath = await writeCaptionQualityReportFiles(
        params.artifactsDir,
        rating,
        outcome.attemptHistory
      );
      caption = buildCaptionQualitySummary(reportPath, rating, outcome.attempts, minOverallScore);
      if (!caption.passed) exitCode = 1;
    }
  }

  return { result, finalOptions, sync, caption, exitCode };
}

async function writeSyncQualityReportFiles(
  artifactsDir: string,
  rating: SyncRatingOutput,
  attemptHistory: Array<{ rating?: SyncRatingOutput }>
): Promise<string> {
  const reportPath = join(artifactsDir, 'sync-report.json');
  await writeOutputFile(reportPath, rating);

  for (let i = 0; i < attemptHistory.length; i++) {
    const attempt = attemptHistory[i];
    if (!attempt.rating) continue;
    await writeOutputFile(join(artifactsDir, `sync-report-attempt${i + 1}.json`), attempt.rating);
  }

  return reportPath;
}

async function writeCaptionQualityReportFiles(
  artifactsDir: string,
  rating: CaptionQualityRatingOutput,
  attemptHistory: Array<{ rating?: CaptionQualityRatingOutput; settings?: unknown }>
): Promise<string> {
  const reportPath = join(artifactsDir, 'caption-report.json');
  await writeOutputFile(reportPath, rating);

  for (let i = 0; i < attemptHistory.length; i++) {
    const attempt = attemptHistory[i];
    if (!attempt.rating) continue;
    await writeOutputFile(
      join(artifactsDir, `caption-report-attempt${i + 1}.json`),
      attempt.rating
    );
    if (attempt.settings) {
      await writeOutputFile(
        join(artifactsDir, `caption-settings-attempt${i + 1}.json`),
        attempt.settings
      );
    }
  }

  const lastAttempt = attemptHistory[attemptHistory.length - 1];
  if (lastAttempt?.settings) {
    await writeOutputFile(join(artifactsDir, 'caption-settings.json'), lastAttempt.settings);
  }

  return reportPath;
}

async function writeResolvedTemplateArtifact(params: {
  artifactsDir: string;
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>>;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  templateFonts: FontSource[];
  templateOverlays: OverlayAsset[];
  options: GenerateOptions;
}): Promise<string> {
  const outPath = join(params.artifactsDir, 'template.resolved.json');
  await writeOutputFile(outPath, {
    schemaVersion: '1.0.0',
    templateSpec: params.options.template ?? null,
    resolved: {
      id: params.resolvedTemplate.template.id,
      name: params.resolvedTemplate.template.name,
      description: params.resolvedTemplate.template.description ?? null,
      compositionId: params.resolvedTemplate.template.compositionId,
      source: formatTemplateSource(params.resolvedTemplate),
      templatePath: params.resolvedTemplate.templatePath ?? null,
      templateDir: params.resolvedTemplate.templateDir ?? null,
      templateSchemaVersion: params.resolvedTemplate.template.schemaVersion,
      defaults: params.resolvedTemplate.template.defaults ?? null,
      params: params.resolvedTemplate.template.params ?? null,
      assets: params.resolvedTemplate.template.assets ?? null,
      remotion: params.resolvedTemplate.template.remotion ?? null,
    },
    derived: {
      templateDefaults: params.templateDefaults ?? null,
      templateParams: params.templateParams,
      templateGameplay: params.templateGameplay,
      templateFonts: params.templateFonts,
      templateOverlays: params.templateOverlays,
    },
    effective: {
      archetype: params.options.archetype ?? null,
      orientation: params.options.orientation ?? null,
      fps: params.options.fps ?? null,
      captionPreset: params.options.captionPreset ?? null,
      captionFontFamily: params.options.captionFontFamily ?? null,
      captionFontWeight: params.options.captionFontWeight ?? null,
      captionFontFile: params.options.captionFontFile ?? null,
    },
  });
  return outPath;
}

async function finalizeGenerateOutput(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
  sync: SyncQualitySummary | null;
  caption: CaptionQualitySummary | null;
  exitCode: number;
}): Promise<void> {
  if (params.runtime.json) {
    writeSuccessJson({
      topic: params.topic,
      archetype: params.archetype,
      orientation: params.orientation,
      options: params.options,
      templateSpec: params.templateSpec,
      resolvedTemplateId: params.resolvedTemplateId,
      runtime: params.runtime,
      artifactsDir: params.artifactsDir,
      result: params.result,
      sync: params.sync,
      caption: params.caption,
      exitCode: params.exitCode,
    });
    return;
  }

  await showSuccessSummary(
    params.result,
    params.options,
    params.artifactsDir,
    params.sync,
    params.caption,
    params.topic
  );
  if (params.exitCode !== 0) process.exit(params.exitCode);
}

async function runGenerate(
  topic: string,
  options: GenerateOptions,
  command: Command
): Promise<void> {
  const runtime = getCliRuntime();
  const artifactsDir = dirname(options.output);

  applyDefaultsFromConfig(options, command);
  applyQualityDefaults(options, command);
  applySyncPresetDefaults(options, command);
  applyCaptionQualityPerfectDefaults(options, command);
  let resolvedWorkflow: Awaited<ReturnType<typeof resolveWorkflow>> | undefined;
  let workflowError: ReturnType<typeof getCliErrorInfo> | null = null;

  if (options.workflow) {
    try {
      resolvedWorkflow = await resolveWorkflow(options.workflow);
    } catch (error) {
      workflowError = getCliErrorInfo(error);
      if (!options.preflight) {
        throw error;
      }
    }
  }

  const workflowDefinition = resolvedWorkflow?.workflow;
  const workflowBaseDir = resolvedWorkflow?.baseDir;
  const workflowStageModes = resolveWorkflowStageModes(workflowDefinition);

  // Apply workflow defaults before template defaults so templates can override workflows.
  applyWorkflowDefaults(options, command, workflowDefinition, new Set(['workflowAllowExec']));
  applyWorkflowInputs(options, command, workflowDefinition, workflowBaseDir);
  applyWorkflowStageDefaults(options, workflowStageModes, artifactsDir);

  const { resolvedTemplate, templateDefaults, templateParams, templateGameplay, templateOverlays } =
    await resolveTemplateAndApplyDefaults(options, command);
  const templateSpec = toNullableString(options.template);
  const resolvedTemplateId = resolveTemplateId(resolvedTemplate);

  const templateGameplayPath = templateGameplay?.clip ?? templateGameplay?.library;
  if (!options.gameplay && templateGameplayPath) {
    options.gameplay = templateGameplayPath;
  }
  if (!options.gameplayStyle && templateGameplay?.style) {
    options.gameplayStyle = templateGameplay.style;
  }

  printHeader(topic, options, runtime);

  const resolvedArchetype = await resolveArchetype(options.archetype);
  const archetype = resolvedArchetype.archetype.id;
  const orientation = OrientationEnum.parse(options.orientation);
  if (!runtime.json) {
    writeStderrLine(
      chalk.gray(`Archetype resolved: ${archetype} (${formatArchetypeSource(resolvedArchetype)})`)
    );
  }

  if (options.preflight) {
    const preflight = await runGeneratePreflight({
      topic,
      options,
      resolvedTemplate,
      templateGameplay,
      runtime,
      command,
      resolvedWorkflow,
      workflowError,
    });
    writePreflightOutput({
      topic,
      options,
      runtime,
      templateSpec,
      resolvedTemplateId,
      checks: preflight.checks,
      passed: preflight.passed,
      exitCode: preflight.exitCode,
    });
    return;
  }

  if (
    handleDryRun({
      topic,
      options,
      runtime,
      artifactsDir,
      archetype,
      orientation,
      templateSpec,
      resolvedTemplateId,
    })
  )
    return;

  if (isExternalStageMode(workflowStageModes.render)) {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Workflow render stages are not supported in cm generate',
      {
        fix: 'Remove render stage overrides or use `cm render` with your artifacts',
      }
    );
  }

  const remotionProject = resolvedTemplate
    ? resolveRemotionTemplateProject(resolvedTemplate)
    : null;
  let allowTemplateCode: boolean | undefined;
  let installTemplateDeps: boolean | undefined;
  let templatePackageManager: 'npm' | 'pnpm' | 'yarn' | undefined;

  if (remotionProject) {
    const config = loadConfig();

    const allowTemplateCodeSource = command.getOptionValueSource('allowTemplateCode');
    allowTemplateCode =
      allowTemplateCodeSource === 'default' || allowTemplateCodeSource === undefined
        ? Boolean(config.render.allowTemplateCode)
        : Boolean(options.allowTemplateCode);

    if (!allowTemplateCode) {
      throw new CMError('INVALID_ARGUMENT', 'Code templates require --allow-template-code', {
        templateId: resolvedTemplate?.template.id,
        templateDir: remotionProject.templateDir,
        fix: 'Re-run with --allow-template-code to allow executing template-provided Remotion code',
      });
    }

    const templateDepsSource = command.getOptionValueSource('templateDeps');
    const templateDepsRaw =
      templateDepsSource === 'default' || templateDepsSource === undefined
        ? (remotionProject.installDeps ?? config.render.templateDeps)
        : options.templateDeps;
    const templateDepsMode = parseTemplateDepsMode(templateDepsRaw ?? 'prompt');

    const templatePmSource = command.getOptionValueSource('templatePm');
    const templatePmRaw =
      templatePmSource === 'default' || templatePmSource === undefined
        ? (remotionProject.packageManager ?? config.render.templatePackageManager)
        : options.templatePm;
    const templatePmValue = templatePmRaw ? String(templatePmRaw) : undefined;
    templatePackageManager =
      templatePmValue === 'npm' || templatePmValue === 'pnpm' || templatePmValue === 'yarn'
        ? templatePmValue
        : undefined;

    const templateHasPackageJson = existsSync(join(remotionProject.rootDir, 'package.json'));
    const templateHasNodeModules = existsSync(join(remotionProject.rootDir, 'node_modules'));
    const templateDepsMissing = templateHasPackageJson && !templateHasNodeModules;
    installTemplateDeps = templateDepsMissing
      ? await resolveTemplateDepsInstallDecision({
          runtime,
          rootDir: remotionProject.rootDir,
          mode: templateDepsMode ?? 'prompt',
        })
      : false;

    if (templateDepsMissing && runtime.offline && templateDepsMode === 'auto') {
      throw new CMError(
        'OFFLINE',
        'Offline mode enabled; cannot auto-install template dependencies',
        {
          rootDir: remotionProject.rootDir,
          fix: 'Re-run without --offline, or pass --template-deps never and install dependencies manually if needed',
        }
      );
    }
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && !options.workflowAllowExec) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow exec hooks require --workflow-allow-exec', {
      fix: 'Re-run with --workflow-allow-exec to allow workflow commands',
    });
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && options.workflowAllowExec) {
    const preCommands = collectWorkflowPreCommands(workflowDefinition);
    if (preCommands.length > 0) {
      logger.info({ count: preCommands.length }, 'Running workflow commands');
      await runWorkflowCommands(preCommands, {
        baseDir: workflowBaseDir,
        allowOutput: !runtime.json,
      });
    }
  }

  const { scriptInput, audioInput, visualsInput } = await loadExternalPipelineInputs(options);
  assertWorkflowStageInputs({
    stageModes: workflowStageModes,
    scriptInput,
    audioInput,
    visualsInput,
  });

  if (audioInput && options.autoRetrySync) {
    options.autoRetrySync = false;
  }

  const hook = await resolveHookFromCli(options);
  if (!options.hook && hook) {
    options.hook = hook.id ?? hook.path;
  }

  logger.info(
    {
      topic,
      archetype,
      orientation,
      template: resolvedTemplate?.template.id,
      templateSource: getTemplateSourceForLog(resolvedTemplate),
      workflow: resolvedWorkflow?.workflow.id,
      workflowSource: resolvedWorkflow ? formatWorkflowSource(resolvedWorkflow) : undefined,
      fps: getLogFps(options),
      captionPreset: getCaptionPreset(options),
      hook: hook?.id ?? hook?.path ?? null,
    },
    'Starting full pipeline'
  );

  const research = scriptInput
    ? undefined
    : await loadOrRunResearch(options.research, topic, options.mock);
  reportResearchSummary(research, runtime);

  const llmProvider = createGenerateLlmProvider(topic, options, runtime);

  const gameplaySpecified = Boolean(options.gameplay);
  const gameplayStyleSpecified = Boolean(options.gameplayStyle);
  const gameplayStrictSource = command.getOptionValueSource('gameplayStrict');
  const gameplayStrict =
    gameplayStrictSource === 'default' ? undefined : Boolean(options.gameplayStrict);
  const templateRequired =
    templateGameplay?.required ?? Boolean(templateGameplay?.library || templateGameplay?.clip);

  const templateClip = !options.gameplay ? templateGameplay?.clip : undefined;
  const templateLibrary = !options.gameplay ? templateGameplay?.library : undefined;
  const gameplayRequested =
    gameplaySpecified || gameplayStyleSpecified || Boolean(gameplayStrict) || templateRequired;

  const gameplay = gameplayRequested
    ? {
        clip: templateClip,
        library: options.gameplay ?? templateLibrary,
        style: options.gameplayStyle ?? templateGameplay?.style,
        required: gameplayStrict ?? (gameplaySpecified ? true : templateRequired),
      }
    : undefined;

  if (gameplay) {
    options.gameplayStrict = gameplay.required;
  }

  const splitLayoutPreset = parseSplitLayoutPreset(options.splitLayout);
  if (splitLayoutPreset) {
    if (options.gameplayPosition == null)
      options.gameplayPosition = splitLayoutPreset.gameplayPosition;
    if (options.contentPosition == null)
      options.contentPosition = splitLayoutPreset.contentPosition;
  }

  const gameplayPosition = parseLayoutPosition(options.gameplayPosition, '--gameplay-position');
  const contentPosition = parseLayoutPosition(options.contentPosition, '--content-position');
  if (gameplayPosition) options.gameplayPosition = gameplayPosition;
  if (contentPosition) options.contentPosition = contentPosition;

  const { result, finalOptions, sync, caption, exitCode } =
    await runPipelineWithOptionalSyncQualityGate({
      topic,
      archetype,
      orientation,
      options,
      resolvedTemplate,
      remotionProject,
      allowTemplateCode,
      installTemplateDeps,
      templateDepsAllowOutput: runtime.verbose,
      templatePackageManager,
      templateDefaults,
      templateParams,
      templateOverlays,
      gameplay,
      hook,
      research,
      llmProvider,
      runtime,
      artifactsDir,
      scriptInput,
      audioInput,
      visualsInput,
    });

  if (options.keepArtifacts && resolvedTemplate) {
    const templateFonts = getTemplateFontSources(
      resolvedTemplate.template,
      resolvedTemplate.templateDir
    );
    const templateOverlays = getTemplateOverlays(
      resolvedTemplate.template,
      resolvedTemplate.templateDir
    );
    await writeResolvedTemplateArtifact({
      artifactsDir,
      resolvedTemplate,
      templateDefaults,
      templateParams,
      templateGameplay,
      templateFonts,
      templateOverlays,
      options,
    });
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && options.workflowAllowExec) {
    const postCommands = collectWorkflowPostCommands(workflowDefinition);
    if (postCommands.length > 0) {
      logger.info({ count: postCommands.length }, 'Running workflow post commands');
      await runWorkflowCommands(postCommands, {
        baseDir: workflowBaseDir,
        allowOutput: !runtime.json,
      });
    }
  }

  await finalizeGenerateOutput({
    topic,
    archetype,
    orientation,
    options: finalOptions,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
    sync,
    caption,
    exitCode,
  });
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse(createMockScriptResponse(topic));
  return provider;
}

function showDryRunSummary(
  topic: string,
  options: GenerateOptions,
  archetype: string,
  orientation: string
): void {
  writeStderrLine('Dry-run mode - no execution');
  writeStderrLine(`   Topic: ${topic}`);
  writeStderrLine(`   Archetype: ${archetype}`);
  writeStderrLine(`   Orientation: ${orientation}`);
  writeStderrLine(`   Voice: ${options.voice}`);
  writeStderrLine(`   Duration: ${options.duration}s`);
  writeStderrLine(`   Output: ${options.output}`);
  writeStderrLine(`   Keep artifacts: ${options.keepArtifacts}`);
  writeStderrLine(`   Research: ${options.research ? 'enabled' : 'disabled'}`);
  if (options.workflow) {
    writeStderrLine(`   Workflow: ${options.workflow}`);
  }
  if (options.script) {
    writeStderrLine(`   Script: ${options.script}`);
  }
  if (options.audio) {
    writeStderrLine(`   Audio: ${options.audio}`);
  }
  if (options.timestamps) {
    writeStderrLine(`   Timestamps: ${options.timestamps}`);
  }
  if (options.audioMix) {
    writeStderrLine(`   Audio mix: ${options.audioMix}`);
  }
  if (options.visuals) {
    writeStderrLine(`   Visuals: ${options.visuals}`);
  }
  const mixOptions = buildAudioMixOptions(options);
  const hasMix = hasAudioMixSources(mixOptions) || Boolean(options.audioMix);
  writeStderrLine(
    `   Pipeline: ${options.pipeline ?? 'standard'}${options.pipeline === 'audio-first' ? ' (requires Whisper)' : ''}`
  );
  if (options.whisperModel) {
    writeStderrLine(`   Whisper Model: ${options.whisperModel}`);
  }
  if (options.captionGroupMs) {
    writeStderrLine(`   Caption Group: ${options.captionGroupMs}ms`);
  }
  if (options.reconcile) {
    writeStderrLine(`   Reconcile: enabled (match ASR to script)`);
  }
  if (options.captionMode) {
    writeStderrLine(`   Caption Mode: ${options.captionMode}`);
  }
  const wordsPerPage = options.wordsPerPage ?? options.captionMaxWords;
  if (wordsPerPage) {
    writeStderrLine(`   Caption Max Words: ${wordsPerPage}`);
  }
  if (options.captionMinWords) {
    writeStderrLine(`   Caption Min Words: ${options.captionMinWords}`);
  }
  if (options.captionTargetWords) {
    writeStderrLine(`   Caption Target Words: ${options.captionTargetWords}`);
  }
  if (options.captionMaxWpm) {
    writeStderrLine(`   Caption Max WPM: ${options.captionMaxWpm}`);
  }
  if (options.captionMaxCps) {
    writeStderrLine(`   Caption Max CPS: ${options.captionMaxCps}`);
  }
  if (options.captionMinOnScreenMs) {
    writeStderrLine(`   Caption Min On-Screen: ${options.captionMinOnScreenMs}ms`);
  }
  if (options.captionMinOnScreenMsShort) {
    writeStderrLine(`   Caption Min On-Screen (Short): ${options.captionMinOnScreenMsShort}ms`);
  }
  if (options.captionDropFillers) {
    writeStderrLine('   Caption Cleanup: drop fillers');
  }
  if (options.captionFillerWords) {
    writeStderrLine(`   Caption Filler Words: ${options.captionFillerWords}`);
  }
  if (options.maxLines) {
    writeStderrLine(`   Max Lines: ${options.maxLines}`);
  }
  if (options.charsPerLine) {
    writeStderrLine(`   Chars Per Line: ${options.charsPerLine}`);
  }
  if (options.captionAnimation) {
    writeStderrLine(`   Caption Animation: ${options.captionAnimation}`);
  }
  if (options.captionFontFamily) {
    writeStderrLine(`   Caption Font: ${options.captionFontFamily}`);
  }
  if (options.captionFontFile) {
    writeStderrLine(`   Caption Font File: ${options.captionFontFile}`);
  }
  if (options.mixPreset) {
    writeStderrLine(`   Mix Preset: ${options.mixPreset}`);
  }
  if (typeof options.music === 'string') {
    writeStderrLine(`   Music: ${options.music}`);
  }
  if (Array.isArray(options.sfx) && options.sfx.length > 0) {
    writeStderrLine(`   SFX: ${options.sfx.join(', ')}`);
  }
  if (options.sfxPack) {
    writeStderrLine(`   SFX Pack: ${options.sfxPack}`);
  }
  if (typeof options.ambience === 'string') {
    writeStderrLine(`   Ambience: ${options.ambience}`);
  }
  if (options.gameplay) {
    writeStderrLine(`   Gameplay: ${options.gameplay}`);
  }
  if (options.gameplayStyle) {
    writeStderrLine(`   Gameplay Style: ${options.gameplayStyle}`);
  }
  if (options.gameplayStrict) {
    writeStderrLine('   Gameplay Strict: enabled');
  }
  if (options.gameplayPosition) {
    writeStderrLine(`   Gameplay Position: ${options.gameplayPosition}`);
  }
  if (options.contentPosition) {
    writeStderrLine(`   Content Position: ${options.contentPosition}`);
  }
  if (options.hook) {
    writeStderrLine(`   Hook: ${options.hook}`);
  }
  if (options.hookTrim) {
    writeStderrLine(`   Hook Trim: ${options.hookTrim}s`);
  }
  writeStderrLine('   Pipeline stages:');
  if (options.research) {
    writeStderrLine('   0. Research -> research.json');
  }
  writeStderrLine(
    options.script ? `   1. Script -> ${options.script} (external)` : '   1. Script -> script.json'
  );
  if (options.audio) {
    const tsLabel = options.timestamps ? options.timestamps : 'timestamps.json';
    writeStderrLine(
      `   2. Audio -> ${options.audio} + ${tsLabel}${hasMix ? ' + audio.mix.json' : ''} (external)`
    );
  } else {
    writeStderrLine(
      `   2. Audio -> audio.wav + timestamps.json${hasMix ? ' + audio.mix.json' : ''}${options.pipeline === 'audio-first' ? ' (Whisper ASR required)' : ''}`
    );
  }
  writeStderrLine(
    options.visuals
      ? `   3. Visuals -> ${options.visuals} (external)`
      : '   3. Visuals -> visuals.json'
  );
  writeStderrLine(`   4. Render -> ${options.output}`);
}

async function showSuccessSummary(
  result: PipelineResult,
  options: GenerateOptions,
  artifactsDir: string,
  sync: SyncQualitySummary | null,
  caption: CaptionQualitySummary | null,
  topic: string
): Promise<void> {
  const titleParts: string[] = [];
  if (sync && !sync.passed) titleParts.push('sync failed');
  if (caption && !caption.passed) titleParts.push('caption quality failed');
  const title =
    titleParts.length > 0 ? `Video generated (${titleParts.join(', ')})` : 'Video generated';
  const rows: Array<[string, string]> = [
    ['Title', result.script.title ?? topic],
    ['Duration', `${result.duration.toFixed(1)}s`],
    ['Resolution', `${result.width}x${result.height}`],
    ['Size', `${(result.fileSize / 1024 / 1024).toFixed(1)} MB`],
    ['Video', result.outputPath],
  ];
  if (result.visuals.gameplayClip) {
    rows.push(['Gameplay', result.visuals.gameplayClip.path]);
  }
  if (options.hook) {
    rows.push(['Hook', options.hook]);
  }
  const lines = formatKeyValueRows(rows);

  if (result.costs) {
    lines.push(
      '',
      'Costs',
      ...formatKeyValueRows([
        ['Total', `$${result.costs.total.toFixed(4)}`],
        ['LLM', `$${result.costs.llm.toFixed(4)}`],
        ['TTS', `$${result.costs.tts.toFixed(4)}`],
      ])
    );
  }

  if (sync) {
    const status = sync.passed ? 'PASSED' : 'FAILED';
    lines.push(
      '',
      `Sync rating: ${sync.rating}/100 (${sync.ratingLabel}) - ${status} (attempts: ${sync.attempts})`,
      `Sync report: ${sync.reportPath}`
    );
  }

  if (caption) {
    const status = caption.passed ? 'PASSED' : 'FAILED';
    lines.push(
      '',
      `Caption quality: overall=${caption.overallScore.toFixed(2)} - ${status} (attempts: ${caption.attempts})`,
      `Caption report: ${caption.reportPath}`
    );
  }

  if (options.keepArtifacts) {
    const artifactRows: Array<[string, string]> = [
      ['Script', join(artifactsDir, 'script.json')],
      ['Audio', join(artifactsDir, 'audio.wav')],
      ['Timestamps', join(artifactsDir, 'timestamps.json')],
    ];
    if (result.audio.audioMixPath) {
      artifactRows.push(['Audio mix', result.audio.audioMixPath]);
    }
    artifactRows.push(['Visuals', join(artifactsDir, 'visuals.json')]);
    if (options.template) {
      artifactRows.push(['Template', join(artifactsDir, 'template.resolved.json')]);
    }
    lines.push('', 'Artifacts', ...formatKeyValueRows(artifactRows));
  }

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  await writeSummaryCard({
    title,
    lines,
    footerLines: [`Next: cm validate ${result.outputPath} --profile ${profile}`],
  });

  // Human-mode stdout should be reserved for the primary artifact path.
  writeStdoutLine(result.outputPath);
}

/**
 * Load research from file or run new research
 */
async function loadOrRunResearch(
  researchOption: string | boolean | undefined,
  topic: string,
  mock: boolean
): Promise<ResearchOutput | undefined> {
  if (!researchOption) return undefined;

  const normalizedOption =
    typeof researchOption === 'string' ? researchOption.trim().toLowerCase() : researchOption;

  // Commander parses `--research true` as a string value ("true") because the option is `[path]`.
  // Accept common boolean string literals for convenience.
  if (normalizedOption === 'true') {
    researchOption = true;
  } else if (normalizedOption === 'false') {
    return undefined;
  }

  // If it's a file path, load from file
  if (typeof researchOption === 'string') {
    const raw = await readInputFile(researchOption);
    const parsed = ResearchOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SchemaError('Invalid research file', {
        path: researchOption,
        issues: parsed.error.issues,
        fix: 'Generate research via `cm research -q "<topic>" -o research.json` and pass --research research.json',
      });
    }
    return parsed.data;
  }

  // If it's true (boolean flag), run research automatically
  const spinner = createSpinner('Stage 0/4: Researching topic...').start();

  const sources: ResearchSource[] = ['hackernews', 'reddit'];
  if (process.env.BRAVE_SEARCH_API_KEY) sources.push('web');
  if (process.env.TAVILY_API_KEY) sources.push('tavily');

  const llmProvider = mock
    ? undefined
    : process.env.OPENAI_API_KEY
      ? new OpenAIProvider(REPO_FACTS.llm.default.model, process.env.OPENAI_API_KEY)
      : undefined;

  const orchestrator = createResearchOrchestrator(
    {
      sources,
      limitPerSource: 5,
      generateAngles: true,
      maxAngles: 3,
    },
    llmProvider
  );

  try {
    const result = await orchestrator.research(topic);
    spinner.succeed('Stage 0/4: Research complete');
    return result.output;
  } catch (error) {
    spinner.fail('Stage 0/4: Research failed');
    throw error;
  }
}

export const generateCommand = new Command('generate')
  .description('Generate a complete video from a topic')
  .argument('<topic>', 'Topic for the video')
  .option(
    '-a, --archetype <idOrPath>',
    'Script archetype (script format). Use `cm archetypes list`',
    'listicle'
  )
  .option(
    '--template <idOrPath>',
    'Render template (Remotion composition + render defaults). Use `cm templates list`'
  )
  .option('--allow-template-code', 'Allow executing Remotion code templates (dangerous)', false)
  .option(
    '--template-deps <mode>',
    'Template dependency install mode for code templates (auto, prompt, never)'
  )
  .option('--template-pm <pm>', 'Template package manager (npm, pnpm, yarn)')
  .option(
    '--workflow <idOrPath>',
    'Pipeline workflow (orchestration + defaults). Use `cm workflows list`'
  )
  .option('--workflow-allow-exec', 'Allow workflow exec hooks to run')
  .option('--script <path>', 'Use existing script.json (skip script stage)')
  .option('--audio <path>', 'Use existing audio file (requires --timestamps)')
  .option('--audio-mix <path>', 'Use existing audio mix plan (optional)')
  .option('--timestamps <path>', 'Use existing timestamps.json (use with --audio)')
  .option('--visuals <path>', 'Use existing visuals.json (skip visuals stage)')
  .option('-o, --output <path>', 'Output video file path', DEFAULT_ARTIFACT_FILENAMES.video)
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)',
    'capcut'
  )
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--music <pathOrPreset>', 'Background music track or preset')
  .option('--no-music', 'Disable background music')
  .option('--music-volume <db>', 'Music volume in dB')
  .option('--music-duck <db>', 'Music ducking in dB')
  .option('--music-loop', 'Loop music to match voice duration')
  .option('--no-music-loop', 'Disable music looping')
  .option('--music-fade-in <ms>', 'Music fade-in in ms')
  .option('--music-fade-out <ms>', 'Music fade-out in ms')
  .option('--sfx <path>', 'SFX file path (repeatable)', collectList, [])
  .option('--sfx-pack <id>', 'SFX pack id')
  .option('--sfx-at <placement>', 'Auto placement for SFX (hook, scene, list-item, cta)')
  .option('--sfx-volume <db>', 'SFX volume in dB')
  .option('--sfx-min-gap <ms>', 'Minimum gap between SFX in ms')
  .option('--sfx-duration <seconds>', 'Default SFX duration in seconds')
  .option('--no-sfx', 'Disable SFX')
  .option('--ambience <pathOrPreset>', 'Ambience bed track or preset')
  .option('--ambience-volume <db>', 'Ambience volume in dB')
  .option('--ambience-loop', 'Loop ambience to match voice duration')
  .option('--no-ambience-loop', 'Disable ambience looping')
  .option('--ambience-fade-in <ms>', 'Ambience fade-in in ms')
  .option('--ambience-fade-out <ms>', 'Ambience fade-out in ms')
  .option('--no-ambience', 'Disable ambience')
  .option('--mix-preset <preset>', 'Mix preset (clean, punchy, cinematic, viral)')
  .option('--lufs-target <db>', 'Target loudness for final mix (LUFS)')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .option('--research [path]', 'Use research (true = auto-run, or path to research.json)')
  .option(
    '--pipeline <mode>',
    'Pipeline mode: audio-first (default, requires Whisper) or standard',
    'audio-first'
  )
  .option(
    '--whisper-model <model>',
    'Whisper model size: tiny, base (default), small, medium, large (larger = more accurate but slower)'
  )
  .option(
    '--caption-group-ms <ms>',
    'Caption grouping window in milliseconds (default: 800, larger = fewer page transitions)'
  )
  .option('--reconcile', 'Reconcile ASR output to match original script text for cleaner captions')
  // Caption display options
  .option(
    '--caption-mode <mode>',
    'Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence), chunk (CapCut-style)'
  )
  .option(
    '--words-per-page <count>',
    'Words per caption page/group (default: 8 for larger sentences)'
  )
  .option('--caption-max-words <count>', 'Max words per chunk/page (alias of --words-per-page)')
  .option('--caption-min-words <count>', 'Min words per chunk/page')
  .option('--caption-target-words <count>', 'Target words per chunk (chunk mode)')
  .option('--caption-max-wpm <value>', 'Max words per minute for caption pacing')
  .option('--caption-max-cps <value>', 'Max characters per second for caption pacing')
  .option('--caption-min-on-screen-ms <ms>', 'Minimum on-screen time for captions (ms)')
  .option('--caption-min-on-screen-short-ms <ms>', 'Minimum on-screen time for short captions (ms)')
  .option('--caption-drop-fillers', 'Drop filler words from captions')
  .option('--caption-drop-list-markers', 'Drop list markers like "1:" from captions')
  .option('--caption-filler-words <list>', 'Comma-separated filler words/phrases to drop')
  .option('--caption-font-family <name>', 'Caption font family (e.g., Inter)')
  .option('--caption-font-weight <weight>', 'Caption font weight (normal, bold, black, 100-900)')
  .option('--caption-font-file <path>', 'Caption font file to bundle (ttf/otf/woff/woff2)')
  .option(
    '--max-lines <count>',
    'Maximum lines per caption page (default: 2 for multi-line captions)'
  )
  .option(
    '--chars-per-line <count>',
    'Maximum characters per line before wrapping (default: 25, words never break mid-word)'
  )
  .option(
    '--caption-animation <animation>',
    'Caption animation: none (default), fade, slideUp, slideDown, pop, bounce'
  )
  .option(
    '--caption-word-animation <animation>',
    'Active word animation: none (default), pop, bounce, rise, shake'
  )
  .option('--caption-word-animation-ms <ms>', 'Active word animation duration in ms')
  .option('--caption-word-animation-intensity <value>', 'Active word animation intensity (0..1)')
  .option(
    '--caption-offset-ms <ms>',
    'Global caption timing offset in ms (negative = earlier captions)'
  )
  .option('--gameplay <path>', 'Gameplay library directory or clip file path')
  .option('--gameplay-style <name>', 'Gameplay subfolder name (e.g., subway-surfers)')
  .option('--gameplay-strict', 'Fail if gameplay clip is missing')
  .option('--split-layout <layout>', 'Split-screen layout preset (gameplay-top, gameplay-bottom)')
  .option('--gameplay-position <pos>', 'Gameplay position (top, bottom, full)')
  .option('--content-position <pos>', 'Content position (top, bottom, full)')
  .option('--hook <idOrPath>', 'Hook intro clip id, path, or URL')
  .option('--hook-library <name>', 'Hook library id (defaults to config)')
  .option('--hooks-dir <path>', 'Root directory for hook libraries')
  .option('--hook-duration <seconds>', 'Hook duration when ffprobe is unavailable')
  .option('--hook-trim <seconds>', 'Trim hook to N seconds (optional)')
  .option('--hook-audio <mode>', 'Hook audio mode (mute, keep)')
  .option('--hook-fit <mode>', 'Hook fit mode (cover, contain)')
  .option('--download-hook', 'Download missing hook clips')
  .option('--download-assets', 'Download remote visual assets into the render bundle', true)
  .option('--no-download-assets', 'Do not download remote assets (stream URLs directly)')
  .option(
    '--quality',
    'Enable higher-quality defaults (slower): audio-first sync + reconcile + post-render sync/caption quality gates'
  )
  // Sync quality options
  .option(
    '--sync-preset <preset>',
    'Sync quality preset: fast, standard, quality, maximum',
    'standard'
  )
  .option('--sync-quality-check', 'Run sync quality rating after render')
  .option('--min-sync-rating <rating>', 'Minimum acceptable sync rating (0-100)', '75')
  .option('--auto-retry-sync', 'Auto-retry with better strategy if rating fails')
  // Caption quality options (OCR-only)
  .option('--caption-quality-check', 'Run burned-in caption quality rating after render (OCR-only)')
  .option(
    '--caption-perfect',
    'Keep retrying caption tuning until captions are excellent (enables caption quality gate)'
  )
  .option('--caption-quality-mock', 'Use mock caption quality scoring (no OCR)')
  .option(
    '--min-caption-overall <score>',
    'Minimum acceptable caption overall score (0..1 or 0..100)',
    '0.75'
  )
  .option('--auto-retry-captions', 'Auto-retry render with caption tuning if caption quality fails')
  .option('--max-caption-retries <count>', 'Maximum number of caption tuning retries (0-100)', '2')
  .option('--mock', 'Use mock providers (for testing)')
  .option('--dry-run', 'Preview configuration without execution')
  .option('--preflight', 'Validate dependencies and exit without execution')
  .action(async (topic: string, options: GenerateOptions, command: Command) => {
    try {
      await runGenerate(topic, options, command);
    } catch (error) {
      handleCommandError(error);
    }
  });
