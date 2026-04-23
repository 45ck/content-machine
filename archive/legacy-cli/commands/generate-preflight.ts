/**
 * Generate command - preflight validation checks.
 *
 * Extracted from generate.ts as part of ARCH-D4 decomposition.
 */
import type { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../../core/config';
import { CMError } from '../../core/errors';
import { evaluateRequirements, planWhisperRequirements } from '../../core/assets/requirements';
import { LLM_PROVIDERS, VISUALS_PROVIDERS } from '../../domain/repo-facts.generated';
import {
  ResearchOutputSchema,
  ScriptOutputSchema,
  TimestampsOutputSchema,
  AudioMixOutputSchema,
  VisualsOutputSchema,
} from '../../domain';
import {
  resolveRenderTemplate,
  resolveRemotionTemplateProject,
  formatTemplateSource,
  getTemplateGameplaySlot,
  type ResolvedRemotionTemplateProject,
} from '../../render/templates';
import { parseTemplateDepsMode } from '../template-code';
import { readInputFile } from '../utils';
import { getCliErrorInfo } from '../format';
import { getCliRuntime } from '../runtime';
import { chalk } from '../colors';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { resolveHookFromCli } from '../hooks';
import { resolveWorkflow, formatWorkflowSource } from '../../workflows/resolve';
import { workflowHasExec } from '../../workflows/runner';
import { getGoogleAccessToken, getGoogleCloudProjectId } from '../../media/synthesis/google-auth';
import type { GenerateOptions } from './generate-defaults';
import {
  parseVisualsProviderChain,
  parseProviderRoutingPolicy,
  parseOptionalNumber,
  parseMinSyncRating,
  resolveWorkflowStageModes,
  isExternalStageMode,
} from './generate-defaults';
import { buildGenerateSuccessJsonArgs } from './generate-output';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PreflightStatus = 'ok' | 'warn' | 'fail';

export interface PreflightCheck {
  label: string;
  status: PreflightStatus;
  detail?: string;
  fix?: string;
  code?: string;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

const PREFLIGHT_USAGE_CODES = new Set([
  'INVALID_ARGUMENT',
  'SCHEMA_ERROR',
  'FILE_NOT_FOUND',
  'INVALID_JSON',
]);

export function addPreflightCheck(checks: PreflightCheck[], entry: PreflightCheck): void {
  checks.push(entry);
}

export function formatPreflightLine(check: PreflightCheck): string {
  const status =
    check.status === 'ok'
      ? chalk.green('OK ')
      : check.status === 'warn'
        ? chalk.yellow('WARN')
        : chalk.red('FAIL');
  const detail = check.detail ? ` - ${check.detail}` : '';
  return `- ${status} ${check.label}${detail}`;
}

function hasGoogleVeoAdapterConfig(): boolean {
  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  return Boolean(
    (googleApiKey && process.env.CM_MEDIA_VEO_ENDPOINT) || process.env.GOOGLE_CLOUD_PROJECT
  );
}

function googleVeoConfigMode(): 'legacy' | 'vertex' | null {
  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (googleApiKey && process.env.CM_MEDIA_VEO_ENDPOINT) return 'legacy';
  if (process.env.GOOGLE_CLOUD_PROJECT) return 'vertex';
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main preflight runner                                              */
/* ------------------------------------------------------------------ */

export async function runGeneratePreflight(params: {
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
  const config = loadConfig();

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

  // Audio engine checks only matter when the audio stage is built-in (i.e. we will synthesize).
  if (!isExternalStageMode(stageModes.audio) && !options.audio) {
    const ttsEngine = config.audio?.ttsEngine ?? 'kokoro';
    const asrEngine = config.audio?.asrEngine ?? 'whisper';

    if (ttsEngine === 'elevenlabs') {
      const hasKey = Boolean(process.env.ELEVENLABS_API_KEY);
      addPreflightCheck(checks, {
        label: 'TTS engine',
        status: hasKey ? 'ok' : 'fail',
        code: hasKey ? undefined : 'CONFIG_ERROR',
        detail: hasKey ? 'elevenlabs' : 'elevenlabs (ELEVENLABS_API_KEY missing)',
        fix: hasKey ? undefined : 'Set ELEVENLABS_API_KEY in your environment or .env file',
      });
    } else {
      addPreflightCheck(checks, { label: 'TTS engine', status: 'ok', detail: 'kokoro' });
    }

    if (asrEngine === 'elevenlabs-forced-alignment') {
      const hasKey = Boolean(process.env.ELEVENLABS_API_KEY);
      addPreflightCheck(checks, {
        label: 'Timestamp engine',
        status: hasKey ? 'ok' : 'fail',
        code: hasKey ? undefined : 'CONFIG_ERROR',
        detail: hasKey
          ? 'elevenlabs-forced-alignment'
          : 'elevenlabs-forced-alignment (ELEVENLABS_API_KEY missing)',
        fix: hasKey ? undefined : 'Set ELEVENLABS_API_KEY in your environment or .env file',
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
      const providerChain = parseVisualsProviderChain({
        providerRaw: options.visualsProvider ?? config.visuals?.provider,
        fallbackRaw: options.visualsFallbackProviders,
        configFallbacks: Array.isArray(config.visuals?.fallbackProviders)
          ? (config.visuals?.fallbackProviders as string[])
          : [],
      });

      for (const provider of providerChain) {
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
            label: `Visuals provider (${provider})`,
            status: 'fail',
            code: 'CONFIG_ERROR',
            detail: `${provider} (${keyLabel} missing)`,
            fix: `Set ${keyLabel} in your environment or .env file`,
          });
        } else {
          addPreflightCheck(checks, {
            label: `Visuals provider (${provider})`,
            status: 'ok',
            detail: `${provider} (${keyLabel})`,
          });
        }
      }

      const routingPolicy = parseProviderRoutingPolicy(
        options.visualsRoutingPolicy ?? config.visuals?.routingPolicy
      );
      addPreflightCheck(checks, {
        label: 'Visuals routing policy',
        status: 'ok',
        detail: routingPolicy ?? config.visuals?.routingPolicy,
      });

      if (options.visualsMaxGenerationCostUsd) {
        const cap = parseOptionalNumber(options.visualsMaxGenerationCostUsd);
        if (cap == null || cap < 0) {
          addPreflightCheck(checks, {
            label: 'Visuals cost cap',
            status: 'fail',
            code: 'INVALID_ARGUMENT',
            detail: `Invalid value: ${options.visualsMaxGenerationCostUsd}`,
            fix: 'Use a non-negative number, e.g. --visuals-max-generation-cost-usd 2.5',
          });
        } else {
          addPreflightCheck(checks, {
            label: 'Visuals cost cap',
            status: 'ok',
            detail: `$${cap.toFixed(2)}`,
          });
        }
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

  if (options.media && options.mediaVeoAdapter === 'google-veo') {
    const veoMode = googleVeoConfigMode();
    if (!hasGoogleVeoAdapterConfig()) {
      addPreflightCheck(checks, {
        label: 'Google Veo adapter',
        status: 'fail',
        code: 'CONFIG_ERROR',
        detail: 'google-veo is selected but no Veo credentials are configured',
        fix: 'Set GOOGLE_CLOUD_PROJECT plus GOOGLE_CLOUD_ACCESS_TOKEN for Vertex mode, or set GOOGLE_API_KEY/GEMINI_API_KEY plus CM_MEDIA_VEO_ENDPOINT for legacy mode.',
      });
    } else if (veoMode === 'legacy') {
      addPreflightCheck(checks, {
        label: 'Google Veo adapter',
        status: 'ok',
        detail: 'google-veo (legacy gateway)',
      });
    } else {
      try {
        const projectId = await getGoogleCloudProjectId({ timeoutMs: 5_000 });
        await getGoogleAccessToken({ timeoutMs: 5_000 });
        addPreflightCheck(checks, {
          label: 'Google Veo adapter',
          status: 'ok',
          detail: `google-veo (Vertex AI: ${projectId}${process.env.GOOGLE_CLOUD_LOCATION ? `, ${process.env.GOOGLE_CLOUD_LOCATION}` : ''})`,
        });
      } catch (error) {
        const info = getCliErrorInfo(error);
        addPreflightCheck(checks, {
          label: 'Google Veo adapter',
          status: 'fail',
          code: info.code ?? 'CONFIG_ERROR',
          detail: info.message,
          fix:
            info.fix ??
            'Authenticate gcloud (`gcloud auth print-access-token`) or set GOOGLE_CLOUD_ACCESS_TOKEN.',
        });
      }
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

/* ------------------------------------------------------------------ */
/*  Preflight output                                                   */
/* ------------------------------------------------------------------ */

export function writePreflightOutput(params: {
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
