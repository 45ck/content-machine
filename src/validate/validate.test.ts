import { describe, it, expect } from 'vitest';
import { ValidateReportSchema } from '../domain';
import { validateVideoInfo } from './validate';
import type { VideoInfo } from './video-info';

describe('validateVideoInfo', () => {
  it('should pass portrait profile when resolution/duration/format match', () => {
    const info: VideoInfo = {
      path: 'video.mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    const report = validateVideoInfo(info, { profile: 'portrait' });
    expect(report.passed).toBe(true);
    expect(report.gates.every((gate) => gate.passed)).toBe(true);

    const parsed = ValidateReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
  });

  it('should fail resolution gate when profile expects 1080x1920 but video is 720x1280', () => {
    const info: VideoInfo = {
      path: 'video.mp4',
      width: 720,
      height: 1280,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    const report = validateVideoInfo(info, { profile: 'portrait' });
    expect(report.passed).toBe(false);

    const resolutionGate = report.gates.find((gate) => gate.gateId === 'resolution');
    expect(resolutionGate?.passed).toBe(false);
    expect(resolutionGate?.fix).toBe('adjust-render-resolution');
  });

  it('should fail duration gate when video is shorter than minimum', () => {
    const info: VideoInfo = {
      path: 'video.mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 10,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    };

    const report = validateVideoInfo(info, { profile: 'portrait' });
    expect(report.passed).toBe(false);

    const durationGate = report.gates.find((gate) => gate.gateId === 'duration');
    expect(durationGate?.passed).toBe(false);
    if (!durationGate || durationGate.gateId !== 'duration') {
      throw new Error('Expected a duration gate result');
    }
    expect(durationGate.details.actualSeconds).toBe(10);
  });

  it('should fail format gate when codecs do not match mp4/h264/aac', () => {
    const info: VideoInfo = {
      path: 'video.webm',
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
    };

    const report = validateVideoInfo(info, { profile: 'portrait' });
    expect(report.passed).toBe(false);

    const formatGate = report.gates.find((gate) => gate.gateId === 'format');
    expect(formatGate?.passed).toBe(false);
    expect(formatGate?.fix).toBe('adjust-render-format');
  });
});
