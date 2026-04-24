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
    expect(result.warnings).toEqual([]);
  });
});
