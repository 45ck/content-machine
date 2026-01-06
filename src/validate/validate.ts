import { getValidateProfile, type ValidateProfileId } from './profiles';
import type { VideoInfo } from './video-info';
import { runDurationGate, runFormatGate, runResolutionGate } from './gates';
import { probeVideoWithFfprobe } from './ffprobe';
import type { GateResult, ValidateReport } from './schema';
import { VALIDATE_SCHEMA_VERSION } from './schema';
import { PiqBrisqueAnalyzer, runVisualQualityGate, type VideoQualityAnalyzer } from './quality';
import { probeVideoWithPython } from './python-probe';
import { runCadenceGate } from './cadence';

export interface ValidateOptions {
  profile: ValidateProfileId;
  probe?: {
    engine?: 'ffprobe' | 'python';
    ffprobePath?: string;
    pythonPath?: string;
  };
  cadence?: {
    enabled: boolean;
    maxMedianCutIntervalSeconds?: number;
    threshold?: number;
  };
  quality?: {
    enabled: boolean;
    sampleRate?: number;
    analyzer?: VideoQualityAnalyzer;
  };
}

export function validateVideoInfo(info: VideoInfo, options: ValidateOptions): ValidateReport {
  const startTime = Date.now();
  const profile = getValidateProfile(options.profile);

  const gates: GateResult[] = [
    runResolutionGate(info, profile),
    runDurationGate(info, profile),
    runFormatGate(info, profile),
  ];

  const passed = gates.every((gate) => gate.passed || gate.severity !== 'error');

  return {
    schemaVersion: VALIDATE_SCHEMA_VERSION,
    videoPath: info.path,
    profile: options.profile,
    passed,
    summary: {
      width: info.width,
      height: info.height,
      durationSeconds: info.durationSeconds,
      container: info.container,
      videoCodec: info.videoCodec,
      audioCodec: info.audioCodec,
    },
    gates,
    createdAt: new Date().toISOString(),
    runtimeMs: Date.now() - startTime,
  };
}

export async function validateVideoPath(
  videoPath: string,
  options: ValidateOptions
): Promise<ValidateReport> {
  const startTime = Date.now();
  const probeEngine = options.probe?.engine ?? 'ffprobe';
  const info =
    probeEngine === 'python'
      ? await probeVideoWithPython(videoPath, {
          pythonPath: options.probe?.pythonPath,
          ffprobePath: options.probe?.ffprobePath,
        })
      : await probeVideoWithFfprobe(videoPath, { ffprobePath: options.probe?.ffprobePath });
  const base = validateVideoInfo(info, options);

  const profile = getValidateProfile(options.profile);
  const gates: GateResult[] = [...base.gates];

  if (options.cadence?.enabled) {
    gates.push(
      await runCadenceGate(info, {
        maxMedianCutIntervalSeconds: options.cadence.maxMedianCutIntervalSeconds,
        threshold: options.cadence.threshold,
      })
    );
  }

  if (options.quality?.enabled) {
    const analyzer = options.quality.analyzer ?? new PiqBrisqueAnalyzer();
    const summary = await analyzer.analyze(videoPath, { sampleRate: options.quality.sampleRate });
    gates.push(runVisualQualityGate(summary, profile));
  }

  const passed = gates.every((gate) => gate.passed || gate.severity !== 'error');
  return { ...base, gates, passed, runtimeMs: Date.now() - startTime };
}
