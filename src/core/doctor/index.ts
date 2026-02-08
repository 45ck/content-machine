import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig, resolveConfigFiles } from '../config';
import { evaluateRequirements, planWhisperRequirements } from '../assets/requirements';
import { getOptionalApiKey } from '../config';
import type { DoctorCheck, DoctorReport, DoctorStatus } from '../../domain/doctor';
import { createRequireSafe } from '../require';

const execFileAsync = promisify(execFile);

function parseNodeMajor(version: string): number | null {
  const match = String(version)
    .trim()
    .match(/^(\d+)\./);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

function resolveRecommendedNodeMajor(): number | null {
  try {
    const require = createRequireSafe(import.meta.url);
    const pkg = require('../../../package.json') as { engines?: { node?: string } };
    const raw = pkg.engines?.node;
    if (!raw) return null;
    const match = String(raw)
      .trim()
      .match(/^>=\s*(\d+)/);
    if (!match) return null;
    const n = Number.parseInt(match[1], 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function checkBinaryOnPath(
  label: string,
  command: string
): Promise<{ ok: boolean; detail?: string; code?: string; fix?: string }> {
  try {
    await execFileAsync(command, ['-version'], { timeout: 8000 });
    return { ok: true, detail: `${command} (found)` };
  } catch (error: any) {
    const isMissing = Boolean(error && (error.code === 'ENOENT' || error.errno === -2));
    return {
      ok: false,
      code: isMissing ? 'DEPENDENCY_MISSING' : 'DEPENDENCY_ERROR',
      detail: isMissing ? `${command} not found on PATH` : `${command} check failed`,
      fix: `Install ${label} (and ensure \`${command}\` is on PATH)`,
    };
  }
}

function summarizeConfigFiles(): string {
  const resolved = resolveConfigFiles();
  if (resolved.loadedConfigPaths.length === 0) return 'defaults only';
  const project = resolved.projectConfigPath ? `project: ${resolved.projectConfigPath}` : null;
  const user = resolved.userConfigPath ? `user: ${resolved.userConfigPath}` : null;
  return [project, user].filter(Boolean).join(' | ') || 'defaults only';
}

function asStatus(ok: boolean, warn: boolean = false): DoctorStatus {
  if (ok) return 'ok';
  return warn ? 'warn' : 'fail';
}

export interface DoctorOptions {
  strict?: boolean;
}

function buildNodeCheck(): DoctorCheck {
  const currentNode = process.versions.node;
  const currentMajor = parseNodeMajor(currentNode);
  const recommendedMajor = resolveRecommendedNodeMajor();

  const needsUpgrade =
    currentMajor != null &&
    recommendedMajor != null &&
    Number.isFinite(currentMajor) &&
    currentMajor < recommendedMajor;

  if (!needsUpgrade) {
    return { id: 'node', label: 'Node.js', status: 'ok', detail: currentNode };
  }

  return {
    id: 'node',
    label: 'Node.js',
    status: 'warn',
    detail: `${currentNode} (recommended >= ${recommendedMajor})`,
    fix: `Install Node >= ${recommendedMajor} (recommended: use nvm and run \`nvm use\`)`,
    code: 'VERSION_MISMATCH',
  };
}

function buildConfigCheck(): { check: DoctorCheck; config: ReturnType<typeof loadConfig> | null } {
  try {
    const config = loadConfig();
    return {
      config,
      check: { id: 'config', label: 'Config', status: 'ok', detail: summarizeConfigFiles() },
    };
  } catch (error: any) {
    return {
      config: null,
      check: {
        id: 'config',
        label: 'Config',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
        fix: 'Run `cm init` or provide a valid config via `--config <path>`',
        code: 'CONFIG_ERROR',
      },
    };
  }
}

async function buildWhisperChecks(whisperModel: string): Promise<DoctorCheck[]> {
  try {
    const requirements = planWhisperRequirements({ required: true, model: whisperModel });
    const results = await evaluateRequirements(requirements);
    return results.map((result) => ({
      id: result.id,
      label: result.label,
      status: result.ok ? 'ok' : 'fail',
      detail: result.detail,
      fix: result.fix,
      code: result.ok ? undefined : 'DEPENDENCY_MISSING',
    }));
  } catch (error: any) {
    return [
      {
        id: 'whisper',
        label: 'Whisper',
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
        fix: 'Run `cm setup whisper --model base`',
        code: 'DEPENDENCY_ERROR',
      },
    ];
  }
}

function buildLlmKeyCheck(config: any): DoctorCheck | null {
  const llmProvider = config?.llm?.provider;
  if (!llmProvider) return null;

  if (llmProvider === 'gemini') {
    const hasKey = Boolean(
      getOptionalApiKey('GOOGLE_API_KEY') || getOptionalApiKey('GEMINI_API_KEY')
    );
    return {
      id: 'llm',
      label: 'LLM provider',
      status: asStatus(hasKey, true),
      detail: hasKey ? 'gemini (API key set)' : 'gemini (GOOGLE_API_KEY/GEMINI_API_KEY missing)',
      fix: hasKey
        ? undefined
        : 'Set GOOGLE_API_KEY (or GEMINI_API_KEY) in your environment or .env file',
      code: hasKey ? undefined : 'CONFIG_WARN',
    };
  }

  const llmKey =
    llmProvider === 'openai'
      ? 'OPENAI_API_KEY'
      : llmProvider === 'anthropic'
        ? 'ANTHROPIC_API_KEY'
        : null;
  if (!llmKey) return null;

  const hasKey = Boolean(process.env[llmKey]);
  return {
    id: 'llm',
    label: 'LLM provider',
    status: asStatus(hasKey, true),
    detail: hasKey ? `${llmProvider} (${llmKey} set)` : `${llmProvider} (${llmKey} missing)`,
    fix: hasKey ? undefined : `Set ${llmKey} in your environment or .env file`,
    code: hasKey ? undefined : 'CONFIG_WARN',
  };
}

function buildVisualsKeyCheck(config: any): DoctorCheck | null {
  const visualsProvider = config?.visuals?.provider;
  if (!visualsProvider) return null;

  const fallbackProviders: string[] = Array.isArray(config?.visuals?.fallbackProviders)
    ? config.visuals.fallbackProviders
    : [];
  const usesLocal = [visualsProvider, ...fallbackProviders].some(
    (p) => p === 'local' || p === 'localimage'
  );
  if (usesLocal) {
    const dir = config?.visuals?.local?.dir;
    const manifest = config?.visuals?.local?.manifest;
    const ok = Boolean(dir && String(dir).trim().length > 0);
    const detailParts = [
      `${visualsProvider}${fallbackProviders.length ? ` (+fallbacks: ${fallbackProviders.join(', ')})` : ''}`,
      ok ? 'dir set' : 'dir missing',
      manifest ? `manifest: ${String(manifest)}` : null,
    ].filter(Boolean);
    return {
      id: 'visuals-provider',
      label: 'Visuals provider',
      status: asStatus(ok, true),
      detail: detailParts.join(' | '),
      fix: ok
        ? undefined
        : 'Set visuals.local.dir in your config (or use --local-dir / --provider local/localimage)',
      code: ok ? undefined : 'CONFIG_WARN',
    };
  }
  const visualsKey =
    visualsProvider === 'pexels'
      ? 'PEXELS_API_KEY'
      : visualsProvider === 'pixabay'
        ? 'PIXABAY_API_KEY'
        : visualsProvider === 'nanobanana'
          ? 'GOOGLE_API_KEY (or GEMINI_API_KEY)'
          : 'UNKNOWN';

  const visualsKeyPresent =
    visualsProvider === 'nanobanana'
      ? Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
      : Boolean(process.env[visualsKey]);
  return {
    id: 'visuals-provider',
    label: 'Visuals provider',
    status: asStatus(visualsKeyPresent, true),
    detail: visualsKeyPresent
      ? `${visualsProvider} (${visualsKey} set)`
      : `${visualsProvider} (${visualsKey} missing)`,
    fix: visualsKeyPresent
      ? undefined
      : visualsProvider === 'nanobanana'
        ? 'Set GOOGLE_API_KEY (or GEMINI_API_KEY) in your environment or .env file'
        : `Set ${visualsKey} in your environment or .env file`,
    code: visualsKeyPresent ? undefined : 'CONFIG_WARN',
  };
}

function buildApiKeyChecks(config: any | null): DoctorCheck[] {
  if (!config) return [];
  const checks: DoctorCheck[] = [];
  const llm = buildLlmKeyCheck(config);
  if (llm) checks.push(llm);
  const visuals = buildVisualsKeyCheck(config);
  if (visuals) checks.push(visuals);
  return checks;
}

async function buildFfprobeCheck(): Promise<DoctorCheck> {
  const ffprobe = await checkBinaryOnPath('ffmpeg', 'ffprobe');
  return {
    id: 'ffprobe',
    label: 'ffprobe',
    status: asStatus(ffprobe.ok, true),
    detail: ffprobe.detail,
    fix: ffprobe.ok ? undefined : ffprobe.fix,
    code: ffprobe.ok ? undefined : ffprobe.code,
  };
}

function computeDoctorOk(checks: DoctorCheck[], strict: boolean): boolean {
  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarn = checks.some((c) => c.status === 'warn');
  return !hasFail && !(strict && hasWarn);
}

/**
 * Run environment diagnostics (node, config, whisper, api keys, ffprobe).
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const strict = Boolean(options.strict);

  const checks: DoctorCheck[] = [];
  checks.push(buildNodeCheck());

  const { check: configCheck, config } = buildConfigCheck();
  checks.push(configCheck);

  const whisperModel = config?.sync?.asrModel ?? 'base';
  checks.push(...(await buildWhisperChecks(whisperModel)));

  checks.push(...buildApiKeyChecks(config));
  checks.push(await buildFfprobeCheck());

  return {
    schemaVersion: 1,
    ok: computeDoctorOk(checks, strict),
    strict,
    checks,
  };
}

export type { DoctorCheck, DoctorReport, DoctorStatus } from '../../domain/doctor';
