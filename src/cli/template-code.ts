import { CMError } from '../core/errors';
import { getInquirer } from './inquirer';

/**
 * Template dependency install mode for Remotion code templates.
 */
export type TemplateDepsMode = 'auto' | 'prompt' | 'never';

/**
 * Minimal CLI runtime shape used to decide whether we can prompt the user.
 */
export interface TemplateDepsPromptRuntime {
  offline: boolean;
  yes: boolean;
  isTty: boolean;
  json: boolean;
}

/**
 * Parse the `--template-deps` CLI option.
 */
export function parseTemplateDepsMode(value: unknown): TemplateDepsMode | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'auto' || raw === 'prompt' || raw === 'never') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid --template-deps value: ${value}`, {
    fix: 'Use one of: auto, prompt, never',
  });
}

/**
 * Decide whether to install template dependencies now (auto/prompt/never),
 * based on runtime constraints (offline, non-interactive, --yes).
 */
export async function resolveTemplateDepsInstallDecision(params: {
  runtime: TemplateDepsPromptRuntime;
  rootDir: string;
  mode: TemplateDepsMode;
}): Promise<boolean> {
  const { runtime, rootDir, mode } = params;
  if (mode === 'never') return false;
  if (mode === 'auto') return true;
  // prompt
  if (runtime.offline) return false;
  if (runtime.yes) return true;
  if (!runtime.isTty || runtime.json) return false;

  const inquirer = await getInquirer();
  const result = await inquirer.prompt<{ install: boolean }>({
    type: 'confirm',
    name: 'install',
    message: `Template dependencies are missing in ${rootDir}. Install now?`,
    default: false,
  });

  return Boolean(result.install);
}
