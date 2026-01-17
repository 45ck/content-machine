import { describe, expect, it } from 'vitest';
import type { OCRFrame } from '../domain';
import {
  analyzeBurnedInCaptionQuality,
  DEFAULT_BURNED_IN_CAPTION_THRESHOLDS,
  segmentOcrCaptionTimeline,
} from './burned-in-caption-quality';

function frame(params: Partial<OCRFrame> & Pick<OCRFrame, 'timestamp' | 'text'>): OCRFrame {
  return {
    frameNumber: params.frameNumber ?? 1,
    timestamp: params.timestamp,
    text: params.text,
    confidence: params.confidence ?? 0.9,
    ...(params as Omit<OCRFrame, 'frameNumber' | 'timestamp' | 'text' | 'confidence'>),
  } as OCRFrame;
}

describe('burned-in caption quality', () => {
  it('segments OCR frames into caption segments with durations', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'HELLO WORLD' }),
      frame({ timestamp: 0.5, text: 'HELLO WORLD' }),
      frame({ timestamp: 1.0, text: 'HELLO WORLD' }),
      frame({ timestamp: 1.5, text: 'THIS IS A TEST' }),
      frame({ timestamp: 2.0, text: 'THIS IS A TEST' }),
    ];

    const segments = segmentOcrCaptionTimeline({ ocrFrames: frames, fps });
    expect(segments).toHaveLength(2);
    expect(segments[0]?.text).toBe('HELLO WORLD');
    expect(segments[0]?.durationSeconds).toBeCloseTo(1.5);
    expect(segments[1]?.text).toBe('THIS IS A TEST');
    expect(segments[1]?.durationSeconds).toBeCloseTo(1.0);
  });

  it('detects flicker when the same caption disappears briefly and reappears', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'HELLO' }),
      frame({ timestamp: 0.5, text: 'HELLO' }),
      frame({ timestamp: 1.0, text: '' }),
      frame({ timestamp: 1.5, text: 'HELLO' }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 2,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.flicker.flickerEvents).toBeGreaterThan(0);
    expect(report.flicker.score).toBeLessThan(1);
  });

  it('flags missing terminal punctuation when a sentence appears to end', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'This is a sentence' }),
      frame({ timestamp: 0.5, text: 'This is a sentence' }),
      frame({ timestamp: 1.0, text: 'Next one.' }),
      frame({ timestamp: 1.5, text: 'Next one.' }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 2,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.punctuation.missingTerminalPunctuationCount).toBe(1);
    expect(report.punctuation.score).toBeLessThan(1);
  });

  it('treats ALL CAPS as a valid capitalization style', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'THIS IS FINE' }),
      frame({ timestamp: 0.5, text: 'THIS IS FINE' }),
      frame({ timestamp: 1.0, text: 'STILL FINE' }),
      frame({ timestamp: 1.5, text: 'STILL FINE' }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 2,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.capitalization.style).toBe('all_caps');
    expect(report.capitalization.score).toBeCloseTo(1);
  });

  it('flags safe-area margin violations when bbox is too close to edges', () => {
    const fps = 2;
    const safeMarginRatio = 0.05;
    const frames: OCRFrame[] = [
      frame({
        timestamp: 0.0,
        text: 'HELLO',
        bbox: { x0: 0, y0: 0, x1: 1079, y1: 1919 },
      }),
      frame({
        timestamp: 0.5,
        text: 'HELLO',
        bbox: { x0: 0, y0: 0, x1: 1079, y1: 1919 },
      }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 1,
      frameSize: { width: 1080, height: 1920 },
      thresholds: { ...DEFAULT_BURNED_IN_CAPTION_THRESHOLDS, safeMarginRatio },
    });

    expect(report.safeArea.violationCount).toBeGreaterThan(0);
    expect(report.safeArea.score).toBeLessThan(1);
  });

  it('scores alignment lower when captions are consistently off-center', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({
        timestamp: 0.0,
        text: 'HELLO',
        bbox: { x0: 10, y0: 1600, x1: 110, y1: 1650 },
      }),
      frame({
        timestamp: 0.5,
        text: 'HELLO',
        bbox: { x0: 10, y0: 1600, x1: 110, y1: 1650 },
      }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 1,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.alignment.meanAbsCenterDxRatio).toBeGreaterThan(0);
    expect(report.alignment.score).toBeLessThan(1);
  });

  it('detects jitter when caption bbox moves frame-to-frame', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'HELLO', bbox: { x0: 400, y0: 1600, x1: 680, y1: 1650 } }),
      frame({ timestamp: 0.5, text: 'HELLO', bbox: { x0: 420, y0: 1600, x1: 700, y1: 1650 } }),
      frame({ timestamp: 1.0, text: 'HELLO', bbox: { x0: 380, y0: 1600, x1: 660, y1: 1650 } }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 1.5,
      frameSize: { width: 1080, height: 1920 },
      thresholds: {
        ...DEFAULT_BURNED_IN_CAPTION_THRESHOLDS,
        jitter: {
          maxMeanCenterDeltaPx: 1,
          maxP95CenterDeltaPx: 2,
        },
      },
    });

    expect(report.jitter.meanCenterDeltaPx).toBeGreaterThan(0);
    expect(report.jitter.score).toBeLessThan(0.5);
  });

  it('detects redundant caption reappearance across non-adjacent segments', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'HELLO' }),
      frame({ timestamp: 0.5, text: 'HELLO' }),
      frame({ timestamp: 1.0, text: 'WORLD' }),
      frame({ timestamp: 1.5, text: 'WORLD' }),
      frame({ timestamp: 2.0, text: 'HELLO' }),
      frame({ timestamp: 2.5, text: 'HELLO' }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 3,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.redundancy.reappearanceEvents).toBeGreaterThan(0);
    expect(report.redundancy.score).toBeLessThan(1);
  });

  it('flags dangling conjunction segmentation issues', () => {
    const fps = 2;
    const frames: OCRFrame[] = [
      frame({ timestamp: 0.0, text: 'This is fine and' }),
      frame({ timestamp: 0.5, text: 'This is fine and' }),
      frame({ timestamp: 1.0, text: 'then it breaks.' }),
      frame({ timestamp: 1.5, text: 'then it breaks.' }),
    ];

    const report = analyzeBurnedInCaptionQuality({
      ocrFrames: frames,
      fps,
      videoDurationSeconds: 2,
      frameSize: { width: 1080, height: 1920 },
    });

    expect(report.segmentation.danglingConjunctionCount).toBeGreaterThan(0);
    expect(report.segmentation.score).toBeLessThan(1);
  });
});
