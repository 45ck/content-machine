import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig, resolveConfigFiles } from '../config';
import { evaluateRequirements, planWhisperRequirements } from '../assets/requirements';
import { getOptionalApiKey } from '../config';
import type { DoctorCheck, DoctorReport, DoctorStatus } from '../../domain/doctor';
import { LLM_PROVIDERS, VISUALS_PROVIDERS } from '../../domain/repo-facts.generated';
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

  const facts = LLM_PROVIDERS.find((p) => p.id === llmProvider);
  if (!facts) return null;

  const keys = facts.envVarNames ?? [];
  const hasKey = keys.some((k) => Boolean(getOptionalApiKey(k)));
  const keyLabel =
    keys.length <= 1
      ? String(keys[0] ?? '')
      : `${String(keys[0] ?? '')} (or ${keys.slice(1).join(', ')})`;
  return {
    id: 'llm',
    label: 'LLM provider',
    status: asStatus(hasKey, true),
    detail: hasKey ? `${llmProvider} (API key set)` : `${llmProvider} (${keyLabel} missing)`,
    fix: hasKey ? undefined : `Set ${keyLabel} in your environment or .env file`,
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
  const facts = VISUALS_PROVIDERS.find((p) => p.id === visualsProvider);
  if (!facts) return null;

  const keys = facts.envVarNames ?? [];
  const hasKey = keys.length === 0 ? true : keys.some((k) => Boolean(getOptionalApiKey(k)));
  const keyLabel =
    keys.length === 0
      ? 'no API key required'
      : keys.length === 1
        ? String(keys[0] ?? '')
        : `${String(keys[0] ?? '')} (or ${keys.slice(1).join(', ')})`;
  return {
    id: 'visuals-provider',
    label: 'Visuals provider',
    status: asStatus(hasKey, true),
    detail: hasKey
      ? `${visualsProvider} (${keyLabel})`
      : `${visualsProvider} (${keyLabel} missing)`,
    fix: hasKey ? undefined : `Set ${keyLabel} in your environment or .env file`,
    code: hasKey ? undefined : 'CONFIG_WARN',
  };
}

function buildApiKeyChecks(config: any | null): DoctorCheck[] {
  if (!config) return [];
  const checks: DoctorCheck[] = [];
  const llm = buildLlmKeyCheck(config);
  if (llm) checks.push(llm);
  const visuals = buildVisualsKeyCheck(config);
  if (visuals) checks.push(visuals);
  const ttsEngine = config?.audio?.ttsEngine;
  const asrEngine = config?.audio?.asrEngine;
  const usesElevenLabs = ttsEngine === 'elevenlabs' || asrEngine === 'elevenlabs-forced-alignment';
  if (usesElevenLabs) {
    const hasKey = Boolean(getOptionalApiKey('ELEVENLABS_API_KEY'));
    checks.push({
      id: 'elevenlabs',
      label: 'ElevenLabs',
      status: asStatus(hasKey, true),
      detail: hasKey ? 'ELEVENLABS_API_KEY set' : 'ELEVENLABS_API_KEY missing',
      fix: hasKey ? undefined : 'Set ELEVENLABS_API_KEY in your environment or .env file',
      code: hasKey ? undefined : 'CONFIG_WARN',
    });
  }
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

async function buildFfmpegCheck(): Promise<DoctorCheck> {
  const ffmpeg = await checkBinaryOnPath('ffmpeg', 'ffmpeg');
  return {
    id: 'ffmpeg',
    label: 'ffmpeg',
    status: asStatus(ffmpeg.ok, true),
    detail: ffmpeg.detail,
    fix: ffmpeg.ok ? undefined : ffmpeg.fix,
    code: ffmpeg.ok ? undefined : ffmpeg.code,
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
  checks.push(await buildFfmpegCheck());
  checks.push(await buildFfprobeCheck());

  return {
    schemaVersion: 1,
    ok: computeDoctorOk(checks, strict),
    strict,
    checks,
  };
}

export type { DoctorCheck, DoctorReport, DoctorStatus } from '../../domain/doctor';
