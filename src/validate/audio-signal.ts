import type { ValidateProfile } from './profiles';
import type { AudioSignalGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { resolveFfmpegPath } from '../core/video/ffmpeg';
import { runPythonJson } from './python-json';

const DEFAULT_LOUDNESS_MIN_LUFS = -24;
const DEFAULT_LOUDNESS_MAX_LUFS = -8;
const DEFAULT_MAX_CLIPPING_RATIO = 0.01;
const DEFAULT_TRUE_PEAK_MAX_DBFS = -1;
const CRITICAL_SILENCE_MAX_LOUDNESS_LUFS = -45;
const CRITICAL_SILENCE_MAX_PEAK_LEVEL_DB = -35;

export interface AudioSignalSummary {
  loudnessLUFS: number;
  truePeakDBFS: number;
  loudnessRange: number;
  clippingRatio: number;
  peakLevelDB: number;
  snrDB: number;
}

export interface AudioSignalAnalyzer {
  analyze(mediaPath: string): Promise<AudioSignalSummary>;
}

/** Runs the audio signal quality gate against the given profile thresholds. */
export function runAudioSignalGate(
  summary: AudioSignalSummary,
  profile: ValidateProfile
): AudioSignalGateResult {
  const loudnessMin = profile.loudnessMinLUFS ?? DEFAULT_LOUDNESS_MIN_LUFS;
  const loudnessMax = profile.loudnessMaxLUFS ?? DEFAULT_LOUDNESS_MAX_LUFS;
  const maxClippingRatio = profile.maxClippingRatio ?? DEFAULT_MAX_CLIPPING_RATIO;
  const truePeakMax = profile.truePeakMaxDBFS ?? DEFAULT_TRUE_PEAK_MAX_DBFS;

  const issues: string[] = [];
  const criticalIssues: string[] = [];

  if (summary.loudnessLUFS <= CRITICAL_SILENCE_MAX_LOUDNESS_LUFS) {
    criticalIssues.push(
      `integrated loudness ${summary.loudnessLUFS.toFixed(1)} LUFS <= ${CRITICAL_SILENCE_MAX_LOUDNESS_LUFS} LUFS`
    );
  }
  if (summary.peakLevelDB <= CRITICAL_SILENCE_MAX_PEAK_LEVEL_DB) {
    criticalIssues.push(
      `peak level ${summary.peakLevelDB.toFixed(1)} dB <= ${CRITICAL_SILENCE_MAX_PEAK_LEVEL_DB} dB`
    );
  }

  if (summary.loudnessLUFS < loudnessMin) {
    issues.push(
      `loudness ${summary.loudnessLUFS.toFixed(1)} LUFS < ${loudnessMin} LUFS (too quiet)`
    );
  }
  if (summary.loudnessLUFS > loudnessMax) {
    issues.push(
      `loudness ${summary.loudnessLUFS.toFixed(1)} LUFS > ${loudnessMax} LUFS (too loud)`
    );
  }
  if (summary.clippingRatio > maxClippingRatio) {
    issues.push(
      `clipping ratio ${(summary.clippingRatio * 100).toFixed(2)}% > ${(maxClippingRatio * 100).toFixed(2)}%`
    );
  }
  if (summary.truePeakDBFS > truePeakMax) {
    issues.push(`true peak ${summary.truePeakDBFS.toFixed(1)} dBFS > ${truePeakMax} dBFS`);
  }

  const allIssues = criticalIssues.length > 0 ? [...criticalIssues, ...issues] : issues;
  const passed = allIssues.length === 0;
  const severity = criticalIssues.length > 0 ? 'error' : 'warning';
  const fix = passed ? 'none' : criticalIssues.length > 0 ? 'regenerate-audio' : 'remix-audio';

  return {
    gateId: 'audio-signal',
    passed,
    severity,
    fix,
    message: passed
      ? `Audio signal OK (${summary.loudnessLUFS.toFixed(1)} LUFS, peak ${summary.truePeakDBFS.toFixed(1)} dBFS)`
      : criticalIssues.length > 0
        ? `Audio signal failed: output is silent or near-silent (${allIssues.join('; ')})`
        : `Audio signal issues: ${allIssues.join('; ')}`,
    details: {
      loudnessLUFS: summary.loudnessLUFS,
      truePeakDBFS: summary.truePeakDBFS,
      loudnessRange: summary.loudnessRange,
      clippingRatio: summary.clippingRatio,
      snrDB: summary.snrDB,
      loudnessMinLUFS: loudnessMin,
      loudnessMaxLUFS: loudnessMax,
      maxClippingRatio,
      truePeakMaxDBFS: truePeakMax,
    },
  };
}

function parseAudioSignalJson(data: unknown): AudioSignalSummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid audio signal JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;

  const loudnessLUFS = Number(obj['loudnessLUFS']);
  const truePeakDBFS = Number(obj['truePeakDBFS']);
  const loudnessRange = Number(obj['loudnessRange']);
  const clippingRatio = Number(obj['clippingRatio']);
  const peakLevelDB = Number(obj['peakLevelDB']);
  const snrDB = Number(obj['snrDB']);

  if (
    ![loudnessLUFS, truePeakDBFS, loudnessRange, clippingRatio, peakLevelDB, snrDB].every((n) =>
      Number.isFinite(n)
    )
  ) {
    throw new CMError('VALIDATION_ERROR', 'Invalid audio signal JSON (non-numeric fields)');
  }

  return { loudnessLUFS, truePeakDBFS, loudnessRange, clippingRatio, peakLevelDB, snrDB };
}

/** Analyzes audio signal metrics (loudness, peak, clipping, SNR) using an ffmpeg-based Python script. */
export class FfmpegAudioAnalyzer implements AudioSignalAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'audio_quality.py');
    this.timeoutMs = options?.timeoutMs ?? 180_000;
  }

  async analyze(mediaPath: string): Promise<AudioSignalSummary> {
    const ffmpegPath = resolveFfmpegPath();
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--media', mediaPath, '--ffmpeg-path', ffmpegPath],
      timeoutMs: this.timeoutMs,
    });
    return parseAudioSignalJson(data);
  }
}
