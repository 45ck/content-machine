import type { GateResult, ValidationProfile, VideoInfo } from './types';
import type { VideoQualitySummary } from './types';

export function checkResolution(info: VideoInfo, profile: ValidationProfile): GateResult {
  const passed = info.width === profile.expectedWidth && info.height === profile.expectedHeight;

  return {
    id: 'resolution',
    severity: 'error',
    passed,
    code: passed ? 'ok' : 'wrong-resolution',
    message: passed
      ? `Resolution is ${info.width}x${info.height}`
      : `Expected ${profile.expectedWidth}x${profile.expectedHeight} but got ${info.width}x${info.height}`,
    details: {
      expectedWidth: profile.expectedWidth,
      expectedHeight: profile.expectedHeight,
      actualWidth: info.width,
      actualHeight: info.height,
    },
  };
}

export function checkDuration(info: VideoInfo, profile: ValidationProfile): GateResult {
  const tooShort = info.durationSeconds < profile.minDurationSeconds;
  const tooLong = info.durationSeconds > profile.maxDurationSeconds;
  const passed = !tooShort && !tooLong;

  const code = passed ? 'ok' : tooShort ? 'too-short' : 'too-long';

  return {
    id: 'duration',
    severity: 'error',
    passed,
    code,
    message: passed
      ? `Duration is ${info.durationSeconds}s`
      : `Duration ${info.durationSeconds}s is outside ${profile.minDurationSeconds}-${profile.maxDurationSeconds}s`,
    details: {
      minDurationSeconds: profile.minDurationSeconds,
      maxDurationSeconds: profile.maxDurationSeconds,
      actualDurationSeconds: info.durationSeconds,
    },
  };
}

function normalizeMaybe(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase();
}

interface FormatComparison {
  containerOk: boolean;
  videoCodecOk: boolean;
  audioCodecOk: boolean;
}

function compareFormats(info: VideoInfo, profile: ValidationProfile): FormatComparison {
  const expectedContainer = normalizeMaybe(profile.expectedContainer);
  const expectedVideoCodec = normalizeMaybe(profile.expectedVideoCodec);
  const expectedAudioCodec = normalizeMaybe(profile.expectedAudioCodec);

  const actualContainer = normalizeMaybe(info.container);
  const actualVideoCodec = normalizeMaybe(info.videoCodec);
  const actualAudioCodec = normalizeMaybe(info.audioCodec);

  return {
    containerOk: expectedContainer ? actualContainer === expectedContainer : true,
    videoCodecOk: expectedVideoCodec ? actualVideoCodec === expectedVideoCodec : true,
    audioCodecOk: expectedAudioCodec ? actualAudioCodec === expectedAudioCodec : true,
  };
}

function formatActualString(info: VideoInfo): string {
  return `${info.container ?? 'unknown'}/${info.videoCodec ?? 'unknown'}/${info.audioCodec ?? 'unknown'}`;
}

function formatExpectedString(profile: ValidationProfile): string {
  return `${profile.expectedContainer ?? '*'} / ${profile.expectedVideoCodec ?? '*'} / ${profile.expectedAudioCodec ?? '*'}`;
}

export function checkFormat(info: VideoInfo, profile: ValidationProfile): GateResult {
  const comparison = compareFormats(info, profile);
  const passed = comparison.containerOk && comparison.videoCodecOk && comparison.audioCodecOk;

  return {
    id: 'format',
    severity: 'error',
    passed,
    code: passed ? 'ok' : 'wrong-format',
    message: passed
      ? `Format is ${formatActualString(info)}`
      : `Expected ${formatExpectedString(profile)} but got ${formatActualString(info).replace(/\//g, ' / ')}`,
    details: {
      expected: {
        container: profile.expectedContainer,
        videoCodec: profile.expectedVideoCodec,
        audioCodec: profile.expectedAudioCodec,
      },
      actual: {
        container: info.container,
        videoCodec: info.videoCodec,
        audioCodec: info.audioCodec,
      },
    },
  };
}

export function checkVisualQuality(
  summary: VideoQualitySummary,
  profile: ValidationProfile
): GateResult {
  const threshold = profile.brisqueMax;
  if (threshold === undefined) {
    return {
      id: 'visual-quality',
      severity: 'warn',
      passed: true,
      code: 'skipped',
      message: 'No BRISQUE threshold configured for profile',
    };
  }

  const passed = summary.brisque.mean < threshold;

  return {
    id: 'visual-quality',
    severity: 'error',
    passed,
    code: passed ? 'ok' : 'low-visual-quality',
    message: passed
      ? `BRISQUE mean ${summary.brisque.mean.toFixed(2)} < ${threshold}`
      : `BRISQUE mean ${summary.brisque.mean.toFixed(2)} >= ${threshold}`,
    details: {
      threshold,
      brisque: summary.brisque,
      framesAnalyzed: summary.framesAnalyzed,
    },
  };
}
