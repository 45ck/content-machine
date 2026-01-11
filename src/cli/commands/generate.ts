/**
 * Generate command - Full pipeline: topic -> video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { evaluateRequirements, planWhisperRequirements } from '../../core/assets/requirements';
import {
  ArchetypeEnum,
  OrientationEnum,
  type Archetype,
  type Orientation,
} from '../../core/config';
import { loadConfig } from '../../core/config';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { createSpinner } from '../progress';
import chalk from 'chalk';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { ResearchOutputSchema } from '../../research/schema';
import type { ResearchOutput } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { OpenAIProvider } from '../../core/llm/openai';
import { CMError, SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';
import { getCliErrorInfo } from '../format';
import {
  formatTemplateSource,
  resolveVideoTemplate,
  getTemplateGameplaySlot,
  getTemplateParams,
} from '../../render/templates';
import { ScriptOutputSchema, type ScriptOutput } from '../../script/schema';
import { AudioOutputSchema, TimestampsOutputSchema, type AudioOutput } from '../../audio/schema';
import { AudioMixOutputSchema } from '../../audio/mix/schema';
import { hasAudioMixSources, type AudioMixPlanOptions } from '../../audio/mix/planner';
import { VisualsOutputSchema, type VisualsOutput } from '../../visuals/schema';
import { probeAudioWithFfprobe } from '../../validate/ffprobe-audio';
import type { CaptionConfig, FontSource } from '../../render/schema';
import type { CaptionPresetName } from '../../render/captions/presets';
import type { SyncRatingOutput } from '../../score/sync-schema';
import { resolveHookFromCli } from '../hooks';
import type { HookClip } from '../../hooks/schema';
import {
  runGenerateWithSyncQualityGate,
  type SyncAttemptSettings,
  type SyncQualitySummary,
} from './generate-quality';
import { resolveWorkflow, formatWorkflowSource } from '../../workflows/resolve';
import {
  collectWorkflowPostCommands,
  collectWorkflowPreCommands,
  resolveWorkflowStageMode,
  runWorkflowCommands,
  workflowHasExec,
} from '../../workflows/runner';
import type { WorkflowDefinition, WorkflowStageMode } from '../../workflows/schema';

/**
 * Sync quality presets for different quality/speed tradeoffs
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
  /** Comma-separated filler words/phrases to drop */
  captionFillerWords?: string;
  /** Maximum lines per caption page (default: 2) */
  maxLines?: string;
  /** Maximum characters per line (default: 25) */
  charsPerLine?: string;
  /** Caption animation: none (default), fade, slideUp, slideDown, pop, bounce */
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
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
  /** SFX pack name */
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
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
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
      addPreflightCheck(checks, {
        label: 'Hook clip',
        status: 'fail',
        code: info.code,
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
    try {
      const config = await loadConfig();
      const provider = config.llm.provider;
      const llmKey =
        provider === 'openai'
          ? 'OPENAI_API_KEY'
          : provider === 'anthropic'
            ? 'ANTHROPIC_API_KEY'
            : 'GOOGLE_API_KEY';

      if (!process.env[llmKey]) {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'fail',
          code: 'CONFIG_ERROR',
          detail: `${provider} (${llmKey} missing)`,
          fix: `Set ${llmKey} in your environment or .env file`,
        });
      } else {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'ok',
          detail: `${provider} (${llmKey} set)`,
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
    if (!process.env.PEXELS_API_KEY) {
      addPreflightCheck(checks, {
        label: 'Visuals provider',
        status: 'fail',
        code: 'CONFIG_ERROR',
        detail: 'pexels (PEXELS_API_KEY missing)',
        fix: 'Set PEXELS_API_KEY in your environment or .env file',
      });
    } else {
      addPreflightCheck(checks, {
        label: 'Visuals provider',
        status: 'ok',
        detail: 'pexels (PEXELS_API_KEY set)',
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
    mixPreset: options.mixPreset ?? config.audioMix.preset,
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

function buildGenerateSuccessJsonOutputs(params: {
  result: PipelineResult;
  artifactsDir: string;
  sync: SyncQualitySummary | null | undefined;
}): Record<string, unknown> {
  const { result, artifactsDir, sync } = params;

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
      outputs: buildGenerateSuccessJsonOutputs({ result, artifactsDir, sync }),
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
  if (command.getOptionValueSource(optionName) !== 'default') return;
  options[optionName] = value;
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

function applyCaptionDefaultsFromConfig(options: GenerateOptions, command: Command): void {
  const config = loadConfig();
  const captions = config.captions;
  const record = options as unknown as Record<string, unknown>;
  const defaultFamily =
    captions.fonts && captions.fonts.length > 0 ? captions.fonts[0].family : captions.fontFamily;
  applyDefaultOption(record, command, 'captionFontFamily', defaultFamily);
  applyDefaultOption(record, command, 'captionFontWeight', String(captions.fontWeight));
  applyDefaultOption(record, command, 'captionFontFile', captions.fontFile);
  if (!options.captionFonts && captions.fonts.length > 0) {
    options.captionFonts = captions.fonts;
  }
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
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
}> {
  if (!options.template) {
    return {
      resolvedTemplate: undefined,
      templateDefaults: undefined,
      templateParams: {},
      templateGameplay: null,
    };
  }

  const resolvedTemplate = await resolveVideoTemplate(options.template);
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;
  const templateParams = getTemplateParams(resolvedTemplate.template);
  const templateGameplay = getTemplateGameplaySlot(resolvedTemplate.template);

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

  return { resolvedTemplate, templateDefaults, templateParams, templateGameplay };
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
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
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

    return await runPipeline({
      topic: params.topic,
      archetype: params.archetype as
        | 'listicle'
        | 'versus'
        | 'howto'
        | 'myth'
        | 'story'
        | 'hot-take',
      orientation: params.orientation as 'portrait' | 'landscape' | 'square',
      voice: params.options.voice,
      targetDuration,
      outputPath: params.options.output,
      fps: params.options.fps ? parseInt(params.options.fps, 10) : undefined,
      compositionId: params.resolvedTemplate?.template.compositionId,
      captionPreset: params.options.captionPreset as CaptionPresetName | undefined,
      captionConfig: params.templateDefaults?.captionConfig as Partial<CaptionConfig> | undefined,
      keepArtifacts: params.options.keepArtifacts,
      llmProvider: params.llmProvider,
      mock: params.options.mock,
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
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined
): string | null {
  return resolvedTemplate?.template.id ?? null;
}

function getTemplateSourceForLog(
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined
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

type GeneratePipelineWithQualityGateParams = Parameters<typeof runGeneratePipeline>[0] & {
  artifactsDir: string;
};

interface GeneratePipelineWithQualityGateResult {
  result: PipelineResult;
  finalOptions: GenerateOptions;
  sync: SyncQualitySummary | null;
  exitCode: number;
}

async function runPipelineWithOptionalSyncQualityGate(
  params: GeneratePipelineWithQualityGateParams
): Promise<GeneratePipelineWithQualityGateResult> {
  if (!params.options.syncQualityCheck) {
    const result = await runGeneratePipeline(params);
    return { result, finalOptions: params.options, sync: null, exitCode: 0 };
  }

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

  const rating = outcome.rating;
  if (!rating) {
    return {
      result: outcome.pipelineResult,
      finalOptions: params.options,
      sync: null,
      exitCode: 0,
    };
  }

  const reportPath = await writeSyncQualityReportFiles(
    params.artifactsDir,
    rating,
    outcome.attemptHistory
  );

  const sync = buildSyncQualitySummary(reportPath, rating, outcome.attempts);
  const exitCode = sync.passed ? 0 : 1;

  const finalOptions: GenerateOptions = {
    ...params.options,
    pipeline: outcome.finalSettings.pipelineMode,
    reconcile: outcome.finalSettings.reconcile,
    whisperModel: outcome.finalSettings.whisperModel,
  };

  return { result: outcome.pipelineResult, finalOptions, sync, exitCode };
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
      exitCode: params.exitCode,
    });
    return;
  }

  await showSuccessSummary(
    params.result,
    params.options,
    params.artifactsDir,
    params.sync,
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

  applyCaptionDefaultsFromConfig(options, command);
  applySyncPresetDefaults(options, command);
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

  if (workflowDefinition?.defaults && 'template' in workflowDefinition.defaults) {
    const record = options as unknown as Record<string, unknown>;
    applyDefaultOption(record, command, 'template', workflowDefinition.defaults.template);
  }

  const { resolvedTemplate, templateDefaults, templateParams, templateGameplay } =
    await resolveTemplateAndApplyDefaults(options, command);

  applyWorkflowDefaults(
    options,
    command,
    workflowDefinition,
    new Set(['template', 'workflowAllowExec'])
  );
  applyWorkflowInputs(options, command, workflowDefinition, workflowBaseDir);
  applyWorkflowStageDefaults(options, workflowStageModes, artifactsDir);
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

  const archetype = ArchetypeEnum.parse(options.archetype);
  const orientation = OrientationEnum.parse(options.orientation);

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

  const { result, finalOptions, sync, exitCode } = await runPipelineWithOptionalSyncQualityGate({
    topic,
    archetype,
    orientation,
    options,
    resolvedTemplate,
    templateDefaults,
    templateParams,
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
  topic: string
): Promise<void> {
  const title = sync && !sync.passed ? 'Video generated (sync failed)' : 'Video generated';
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

  const llmProvider = mock
    ? undefined
    : process.env.OPENAI_API_KEY
      ? new OpenAIProvider('gpt-4o-mini', process.env.OPENAI_API_KEY)
      : undefined;

  const orchestrator = createResearchOrchestrator(
    {
      sources: ['hackernews', 'reddit', 'tavily'],
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
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('--template <idOrPath>', 'Video template id or path to template.json')
  .option('--workflow <idOrPath>', 'Workflow id or path to workflow.json')
  .option('--workflow-allow-exec', 'Allow workflow exec hooks to run')
  .option('--script <path>', 'Use existing script.json (skip script stage)')
  .option('--audio <path>', 'Use existing audio file (requires --timestamps)')
  .option('--audio-mix <path>', 'Use existing audio mix plan (optional)')
  .option('--timestamps <path>', 'Use existing timestamps.json (use with --audio)')
  .option('--visuals <path>', 'Use existing visuals.json (skip visuals stage)')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
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
  .option('--sfx-pack <name>', 'SFX pack name')
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
  // Sync quality options
  .option(
    '--sync-preset <preset>',
    'Sync quality preset: fast, standard, quality, maximum',
    'standard'
  )
  .option('--sync-quality-check', 'Run sync quality rating after render')
  .option('--min-sync-rating <rating>', 'Minimum acceptable sync rating (0-100)', '75')
  .option('--auto-retry-sync', 'Auto-retry with better strategy if rating fails')
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
