import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { TimestampsOutput, WordTimestamp } from '../domain';
import { execFfmpeg } from '../core/video/ffmpeg';
import { writeJsonArtifact } from './artifacts';
import { runLongformClipExtract } from './longform-clip-extract';
import { runLongformToShorts } from './longform-to-shorts';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-longform-clip-extract-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createSourceVideo(path: string): Promise<void> {
  await execFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=320x568:rate=15:duration=16',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=48000:duration=16',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      path,
    ],
    {
      timeoutMs: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
      dependencyMessage: 'ffmpeg is required for longform clip extraction tests',
    }
  );
}

function makeWords(): WordTimestamp[] {
  let cursor = 0;
  return [
    'Okay',
    'here',
    'is',
    'the',
    'setup.',
    'Why',
    'do',
    'clips',
    'die',
    'after',
    'three',
    'seconds?',
    'Because',
    'the',
    'cut',
    'starts',
    'before',
    'the',
    'real',
    'question.',
    'Fix',
    'that',
    'and',
    'the',
    'same',
    'footage',
    'feels',
    'twice',
    'as',
    'sharp.',
  ].map((word, index) => {
    const start = cursor;
    const end = start + 0.4;
    cursor = end + (index === 4 || index === 19 ? 0.65 : 0.1);
    return { word, start, end, confidence: 0.95 };
  });
}

function makeTimestamps(words: WordTimestamp[]): TimestampsOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      { sceneId: 'scene-1', audioStart: 0, audioEnd: words[words.length - 1]?.end ?? 1, words },
    ],
    allWords: words,
    totalDuration: words[words.length - 1]?.end ?? 1,
    ttsEngine: 'test',
    asrEngine: 'test',
  };
}

describe('runLongformClipExtract', () => {
  it('extracts approved clips into video, audio, timestamps, and visuals artifacts', async () => {
    const dir = await makeTempDir();
    const sourceMediaPath = join(dir, 'source.mp4');
    const timestampsPath = join(dir, 'timestamps.json');
    await createSourceVideo(sourceMediaPath);
    await writeJsonArtifact(timestampsPath, makeTimestamps(makeWords()));

    const planning = await runLongformToShorts({
      timestampsPath,
      outputDir: join(dir, 'planning'),
      minDuration: 3,
      targetDuration: 9,
      maxDuration: 14,
      maxCandidates: 1,
      autoApproveSelected: true,
    });

    const result = await runLongformClipExtract({
      sourceMediaPath,
      approvalPath: planning.result.approvalPath ?? '',
      boundarySnapPath: planning.result.boundarySnapPath ?? undefined,
      timestampsPath,
      outputDir: join(dir, 'clips'),
      videoMode: 'h264',
    });

    expect(result.result.clipCount).toBe(1);
    const clip = result.result.clips[0]!;
    expect(clip.videoPath).toBeTruthy();
    expect(clip.audioPath).toBeTruthy();
    expect(clip.timestampsPath).toBeTruthy();
    expect(clip.visualsPath).toBeTruthy();

    await expect(stat(clip.videoPath!)).resolves.toMatchObject({ size: expect.any(Number) });
    await expect(stat(clip.audioPath!)).resolves.toMatchObject({ size: expect.any(Number) });

    const timestamps = JSON.parse(await readFile(clip.timestampsPath!, 'utf8')) as {
      allWords: Array<{ start: number; end: number }>;
      totalDuration: number;
    };
    expect(timestamps.allWords[0]?.start).toBeGreaterThanOrEqual(0);
    expect(timestamps.allWords[0]?.end).toBeLessThanOrEqual(timestamps.totalDuration);

    const visuals = JSON.parse(await readFile(clip.visualsPath!, 'utf8')) as {
      scenes: Array<{ source: string; assetPath: string; assetType: string }>;
      fromUserFootage: number;
    };
    expect(visuals.scenes[0]).toMatchObject({
      source: 'user-footage',
      assetPath: clip.videoPath,
      assetType: 'video',
    });
    expect(visuals.fromUserFootage).toBe(1);
  });
});
