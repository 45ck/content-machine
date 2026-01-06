import { getValidateProfile, type ValidateProfileId } from './profiles';
import type { VideoInfo } from './video-info';
import { runDurationGate, runFormatGate, runResolutionGate } from './gates';
import { probeVideoWithFfprobe } from './ffprobe';
import type { GateResult, ValidateReport } from './schema';
import { VALIDATE_SCHEMA_VERSION } from './schema';

export interface ValidateOptions {
  profile: ValidateProfileId;
}

export function validateVideoInfo(info: VideoInfo, options: ValidateOptions): ValidateReport {
  const startTime = Date.now();
  const profile = getValidateProfile(options.profile);

  const gates: GateResult[] = [
    runResolutionGate(info, profile),
    runDurationGate(info, profile),
    runFormatGate(info, profile),
  ];

  const passed = gates.every((gate) => gate.passed);

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
  const info = await probeVideoWithFfprobe(videoPath);
  const report = validateVideoInfo(info, options);
  return { ...report, runtimeMs: Date.now() - startTime };
}
