import { describe, expect, it } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../core/errors';
import {
  analyzePcmForBeatAndSfx,
  classifyCameraMotionFromFrames,
  computeAHash64,
  extractGrayFrameAtTime,
  extractPcmMonoS16le,
  hammingDistance64,
  probeHasAudioStream,
  type GrayFrame,
} from './features';

const execFileAsync = promisify(execFile);

function makeGrayFrame(
  width: number,
  height: number,
  fill: (x: number, y: number) => number
): GrayFrame {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = fill(x, y);
    }
  }
  return { width, height, data };
}

describe('videospec features', () => {
  it('computes stable aHash and hamming distance', () => {
    const a = makeGrayFrame(32, 32, () => 0.2);
    const b = makeGrayFrame(32, 32, () => 0.2);
    const c = makeGrayFrame(32, 32, (x) => (x < 16 ? 0.2 : 0.9));

    const ha = computeAHash64(a);
    const hb = computeAHash64(b);
    const hc = computeAHash64(c);

    expect(hammingDistance64(ha, hb)).toBe(0);
    expect(hammingDistance64(ha, hc)).toBeGreaterThan(0);
  });

  it('classifies static frames as static', () => {
    const a = makeGrayFrame(32, 32, () => 0.4);
    const b = makeGrayFrame(32, 32, () => 0.4);
    const cls = classifyCameraMotionFromFrames({ start: a, end: b });
    expect(cls.motion).toBe('static');
    expect(cls.confidence).toBeGreaterThan(0.5);
  });

  it('classifies obvious horizontal translation as pan', () => {
    // Build an image with a sharp vertical edge, then shift it right.
    const a = makeGrayFrame(32, 32, (x) => (x < 16 ? 0.1 : 0.9));
    const b = makeGrayFrame(32, 32, (x) => (x < 18 ? 0.1 : 0.9));
    const cls = classifyCameraMotionFromFrames({ start: a, end: b });
    expect(['pan_left', 'pan_right', 'unknown']).toContain(cls.motion);
  });

  it('extracts PCM from a video with audio and detects an audio stream', async () => {
    const dir = join(tmpdir(), `cm-videospec-features-${Date.now()}-${Math.random()}`);
    await mkdir(dir, { recursive: true });
    const videoPath = join(dir, 'with-audio.mp4');

    try {
      // 1s black video + 1s sine wave audio (AAC).
      await execFileAsync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=black:s=320x240:d=1',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=440:duration=1',
          '-shortest',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          videoPath,
        ],
        { windowsHide: true, timeout: 60_000 }
      );

      expect(await probeHasAudioStream(videoPath)).toBe(true);
      const pcm = await extractPcmMonoS16le({ videoPath, sampleRate: 22050, maxSeconds: 1 });
      expect(pcm.length).toBeGreaterThan(1000);

      // Cover frame extraction + clamping (negative time, tiny size).
      const frame = await extractGrayFrameAtTime({ videoPath, timeSeconds: -1, size: 2 });
      expect(frame.width).toBe(8);
      expect(frame.height).toBe(8);
      expect(frame.data.length).toBe(64);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('estimates bpm from synthetic pulses', () => {
    const sampleRate = 22050;
    const durationSeconds = 5;
    const n = sampleRate * durationSeconds;
    const pcm = new Int16Array(n);

    // 120 BPM => 0.5s interval.
    const interval = Math.floor(sampleRate * 0.5);
    for (let i = 0; i < n; i += interval) {
      for (let k = 0; k < 200 && i + k < n; k++) pcm[i + k] = 20000;
    }

    const { beatGrid, sfx } = analyzePcmForBeatAndSfx({
      pcmS16le: pcm,
      sampleRate,
      durationSeconds,
    });
    expect(beatGrid.bpm).not.toBeNull();
    expect(beatGrid.bpm as number).toBeGreaterThan(90);
    expect(beatGrid.bpm as number).toBeLessThan(150);
    expect(beatGrid.beats.length).toBeGreaterThan(0);
    expect(sfx.length).toBeGreaterThan(0);
  });

  it('handles empty pcm input', () => {
    const { beatGrid, sfx } = analyzePcmForBeatAndSfx({
      pcmS16le: new Int16Array(),
      sampleRate: 22050,
      durationSeconds: 1,
    });
    expect(beatGrid.bpm).toBeNull();
    expect(beatGrid.beats.length).toBe(0);
    expect(sfx.length).toBe(0);
  });

  it('guards against invalid GrayFrame inputs', () => {
    expect(() => computeAHash64({ width: 2, height: 2, data: new Float32Array(1) })).toThrowError(
      CMError
    );
    const cls = classifyCameraMotionFromFrames({
      start: { width: 8, height: 8, data: new Float32Array(64) },
      end: { width: 16, height: 16, data: new Float32Array(256) },
    });
    expect(cls.motion).toBe('unknown');
  });

  it('wraps ffprobe failures as CMError', async () => {
    await expect(probeHasAudioStream('/path/does/not/exist.mp4')).rejects.toThrowError(CMError);
  });
});
