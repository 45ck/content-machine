import { describe, it, expect } from 'vitest';
import { parsePythonVideoInfo } from './python-probe';

describe('parsePythonVideoInfo', () => {
  it('maps python probe JSON into VideoInfo', () => {
    const info = parsePythonVideoInfo(
      {
        width: 1080,
        height: 1920,
        duration: 45,
        container: 'mp4',
        codec: 'h264',
        audioCodec: 'aac',
      },
      'video.mp4'
    );

    expect(info.path).toBe('video.mp4');
    expect(info.width).toBe(1080);
    expect(info.height).toBe(1920);
    expect(info.durationSeconds).toBe(45);
    expect(info.container).toBe('mp4');
    expect(info.videoCodec).toBe('h264');
    expect(info.audioCodec).toBe('aac');
  });
});

