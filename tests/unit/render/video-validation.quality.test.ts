import { describe, it, expect } from 'vitest';
import { validateVideoFile } from '../../../src/render/validation/validate';
import type {
  VideoInfo,
  VideoInspector,
  VideoQualityAnalyzer,
  VideoQualitySummary,
} from '../../../src/render/validation/types';

class FakeInspector implements VideoInspector {
  constructor(private readonly info: VideoInfo) {}
  async inspect(_videoPath: string): Promise<VideoInfo> {
    return this.info;
  }
}

class FakeQualityAnalyzer implements VideoQualityAnalyzer {
  constructor(private readonly summary: VideoQualitySummary) {}
  async analyze(_videoPath: string): Promise<VideoQualitySummary> {
    return this.summary;
  }
}

describe('render video validation - visual quality (BRISQUE)', () => {
  it('passes when BRISQUE mean is below threshold', async () => {
    const inspector = new FakeInspector({
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
    });

    const analyzer = new FakeQualityAnalyzer({
      brisque: { mean: 35, min: 30, max: 38 },
      framesAnalyzed: 60,
    });

    const report = await validateVideoFile({
      videoPath: 'video.mp4',
      profileName: 'portrait',
      inspector,
      quality: { enabled: true, analyzer },
    });

    const gate = report.results.find((r) => r.id === 'visual-quality');
    expect(gate?.passed).toBe(true);
    expect(report.passed).toBe(true);
  });

  it('fails when BRISQUE mean exceeds threshold', async () => {
    const inspector = new FakeInspector({
      width: 1080,
      height: 1920,
      durationSeconds: 45,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      fps: 30,
    });

    const analyzer = new FakeQualityAnalyzer({
      brisque: { mean: 45, min: 42, max: 55 },
      framesAnalyzed: 60,
    });

    const report = await validateVideoFile({
      videoPath: 'video.mp4',
      profileName: 'portrait',
      inspector,
      quality: { enabled: true, analyzer },
    });

    const gate = report.results.find((r) => r.id === 'visual-quality');
    expect(gate?.passed).toBe(false);
    expect(gate?.code).toBe('low-visual-quality');
    expect(report.passed).toBe(false);
  });
});
