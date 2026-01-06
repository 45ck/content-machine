import { describe, it, expect } from 'vitest';
import { getValidationProfile, validateVideoInfo } from '../../../src/render/validation/validate';
import type { VideoInfo } from '../../../src/render/validation/types';

describe('render video validation', () => {
  it('passes portrait profile for valid video info', () => {
    const profile = getValidationProfile('portrait');

    const info: VideoInfo = {
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
    };

    const report = validateVideoInfo({ videoPath: 'video.mp4', info, profile });

    expect(report.passed).toBe(true);
    expect(report.results.find((r) => r.id === 'resolution')?.passed).toBe(true);
    expect(report.results.find((r) => r.id === 'duration')?.passed).toBe(true);
    expect(report.results.find((r) => r.id === 'format')?.passed).toBe(true);
  });

  it('fails resolution gate with wrong-resolution code', () => {
    const profile = getValidationProfile('portrait');

    const info: VideoInfo = {
      width: 720,
      height: 1280,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
    };

    const report = validateVideoInfo({ videoPath: 'video.mp4', info, profile });

    const gate = report.results.find((r) => r.id === 'resolution');
    expect(gate?.passed).toBe(false);
    expect(gate?.code).toBe('wrong-resolution');
    expect(report.passed).toBe(false);
  });

  it('fails duration gate with too-short code', () => {
    const profile = getValidationProfile('portrait');

    const info: VideoInfo = {
      width: 1080,
      height: 1920,
      durationSeconds: 10,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
    };

    const report = validateVideoInfo({ videoPath: 'video.mp4', info, profile });

    const gate = report.results.find((r) => r.id === 'duration');
    expect(gate?.passed).toBe(false);
    expect(gate?.code).toBe('too-short');
    expect(report.passed).toBe(false);
  });

  it('fails format gate with wrong-format code when codecs mismatch', () => {
    const profile = getValidationProfile('portrait');

    const info: VideoInfo = {
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
      fps: 30,
    };

    const report = validateVideoInfo({ videoPath: 'video.webm', info, profile });

    const gate = report.results.find((r) => r.id === 'format');
    expect(gate?.passed).toBe(false);
    expect(gate?.code).toBe('wrong-format');
    expect(report.passed).toBe(false);
  });
});
