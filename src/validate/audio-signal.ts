import type { ValidateProfile } from './profiles';
import type { AudioSignalGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

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
  const loudnessMin = profile.loudnessMinLUFS ?? -24;
  const loudnessMax = profile.loudnessMaxLUFS ?? -8;
  const maxClippingRatio = profile.maxClippingRatio ?? 0.01;
  const truePeakMax = profile.truePeakMaxDBFS ?? -1;

  const issues: string[] = [];

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

  const passed = issues.length === 0;

  return {
    gateId: 'audio-signal',
    passed,
    severity: 'warning',
    fix: passed ? 'none' : 'remix-audio',
    message: passed
      ? `Audio signal OK (${summary.loudnessLUFS.toFixed(1)} LUFS, peak ${summary.truePeakDBFS.toFixed(1)} dBFS)`
      : `Audio signal issues: ${issues.join('; ')}`,
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
    this.timeoutMs = options?.timeoutMs ?? 60_000;
  }

  async analyze(mediaPath: string): Promise<AudioSignalSummary> {
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--media', mediaPath],
      timeoutMs: this.timeoutMs,
    });
    return parseAudioSignalJson(data);
  }
}
