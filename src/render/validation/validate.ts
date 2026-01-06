import { VALIDATION_PROFILES } from './profiles';
import { checkDuration, checkFormat, checkResolution, checkVisualQuality } from './gates';
import type {
  ValidationProfile,
  ValidationProfileName,
  ValidationReport,
  VideoInfo,
  VideoInspector,
  VideoQualityAnalyzer,
} from './types';
import { FfprobeInspector } from './ffprobe';
import { PiqBrisqueAnalyzer } from './quality';

export function getValidationProfile(name: ValidationProfileName): ValidationProfile {
  return VALIDATION_PROFILES[name];
}

export function validateVideoInfo(params: {
  videoPath: string;
  info: VideoInfo;
  profile: ValidationProfile;
}): ValidationReport {
  const { videoPath, info, profile } = params;
  const results = [
    checkResolution(info, profile),
    checkDuration(info, profile),
    checkFormat(info, profile),
  ];
  const passed = results.every((r) => r.passed || r.severity !== 'error');

  return { videoPath, profile, info, passed, results };
}

export async function validateVideoFile(params: {
  videoPath: string;
  profileName: ValidationProfileName;
  inspector?: VideoInspector;
  quality?: { enabled: boolean; analyzer?: VideoQualityAnalyzer; sampleRate?: number };
}): Promise<ValidationReport> {
  const profile = getValidationProfile(params.profileName);
  const inspector = params.inspector ?? new FfprobeInspector();
  const info = await inspector.inspect(params.videoPath);
  const base = validateVideoInfo({ videoPath: params.videoPath, info, profile });

  if (!params.quality?.enabled) {
    return base;
  }

  const analyzer = params.quality.analyzer ?? new PiqBrisqueAnalyzer();
  const quality = await analyzer.analyze(params.videoPath, {
    sampleRate: params.quality.sampleRate,
  });
  const qualityGate = checkVisualQuality(quality, profile);

  const results = [...base.results, qualityGate];
  const passed = results.every((r) => r.passed || r.severity !== 'error');

  return { ...base, results, passed };
}
