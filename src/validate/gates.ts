import type { ValidateProfile } from './profiles';
import type { VideoInfo } from './video-info';
import type { DurationGateResult, FormatGateResult, ResolutionGateResult } from '../domain';

export function runResolutionGate(info: VideoInfo, profile: ValidateProfile): ResolutionGateResult {
  const passed = info.width === profile.width && info.height === profile.height;
  return {
    gateId: 'resolution',
    passed,
    severity: 'error',
    fix: 'adjust-render-resolution',
    message: passed
      ? `Resolution OK (${info.width}x${info.height})`
      : `Resolution ${info.width}x${info.height} does not match required ${profile.width}x${profile.height}`,
    details: {
      expectedWidth: profile.width,
      expectedHeight: profile.height,
      actualWidth: info.width,
      actualHeight: info.height,
    },
  };
}

export function runDurationGate(info: VideoInfo, profile: ValidateProfile): DurationGateResult {
  const passed =
    info.durationSeconds >= profile.minDurationSeconds &&
    info.durationSeconds <= profile.maxDurationSeconds;

  let message = `Duration OK (${info.durationSeconds.toFixed(1)}s)`;
  if (!passed) {
    if (info.durationSeconds < profile.minDurationSeconds) {
      message = `Duration ${info.durationSeconds.toFixed(1)}s is below minimum ${profile.minDurationSeconds}s`;
    } else {
      message = `Duration ${info.durationSeconds.toFixed(1)}s is above maximum ${profile.maxDurationSeconds}s`;
    }
  }

  return {
    gateId: 'duration',
    passed,
    severity: 'error',
    fix: 'adjust-content-length',
    message,
    details: {
      minSeconds: profile.minDurationSeconds,
      maxSeconds: profile.maxDurationSeconds,
      actualSeconds: info.durationSeconds,
    },
  };
}

export function runFormatGate(info: VideoInfo, profile: ValidateProfile): FormatGateResult {
  const passed =
    info.container === profile.container &&
    info.videoCodec === profile.videoCodec &&
    info.audioCodec === profile.audioCodec;

  return {
    gateId: 'format',
    passed,
    severity: 'error',
    fix: 'adjust-render-format',
    message: passed
      ? `Format OK (${info.container}/${info.videoCodec}/${info.audioCodec})`
      : `Format ${info.container}/${info.videoCodec}/${info.audioCodec} does not match required ${profile.container}/${profile.videoCodec}/${profile.audioCodec}`,
    details: {
      expected: {
        container: profile.container,
        videoCodec: profile.videoCodec,
        audioCodec: profile.audioCodec,
      },
      actual: {
        container: info.container,
        videoCodec: info.videoCodec,
        audioCodec: info.audioCodec,
      },
    },
  };
}
