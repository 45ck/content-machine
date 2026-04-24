import { describe, expect, it } from 'vitest';
import { analyzeSourceMediaFromProbe } from './source-media-analysis';

describe('analyzeSourceMediaFromProbe', () => {
  it('normalizes ffprobe metadata into a local source analysis artifact', () => {
    const result = analyzeSourceMediaFromProbe(
      'input/source.mp4',
      {
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1080,
            height: 1920,
            avg_frame_rate: '30/1',
            nb_frames: '900',
          },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
        format: {
          duration: '30.0',
          format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
        },
      },
      { analyzedAt: '2026-04-24T00:00:00.000Z' }
    );

    expect(result.probe.orientation).toBe('portrait');
    expect(result.probe.durationSeconds).toBe(30);
    expect(result.probe.fps).toBe(30);
    expect(result.probe.hasAudio).toBe(true);
    expect(result.sourceSignals.sampledFrameCount).toBe(120);
    expect(result.sourceSignals.audioEnergyScore).toBeNull();
    expect(result.sourceSignals.sceneChangeScore).toBe(0);
    expect(result.sourceSignals.silenceGaps).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('includes measured ffmpeg source signals when provided', () => {
    const result = analyzeSourceMediaFromProbe(
      'input/source.mp4',
      {
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            avg_frame_rate: '30/1',
          },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
        format: {
          duration: '12.0',
          format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
        },
      },
      {
        analyzedAt: '2026-04-24T00:00:00.000Z',
        measuredSignals: {
          audioRmsDb: -24,
          audioPeakDb: -3,
          silenceGaps: [{ start: 2, end: 2.5, duration: 0.5 }],
          sceneChanges: [3, 6, 9],
        },
      }
    );

    expect(result.sourceSignals.audioEnergyScore).toBeCloseTo(0.75);
    expect(result.sourceSignals.audioRmsDb).toBe(-24);
    expect(result.sourceSignals.audioPeakDb).toBe(-3);
    expect(result.sourceSignals.silenceGapCount).toBe(1);
    expect(result.sourceSignals.totalSilenceSeconds).toBe(0.5);
    expect(result.sourceSignals.sceneChanges).toEqual([3, 6, 9]);
    expect(result.sourceSignals.sceneChangeScore).toBeCloseTo(0.75);
    expect(result.sourceSignals.estimatedSceneCount).toBe(4);
  });
});
