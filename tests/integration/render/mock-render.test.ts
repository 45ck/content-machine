import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { renderVideo } from '../../../src/render/service';

const execFileAsync = promisify(execFile);

async function hasCommand(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ['-version'], { windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const canRun = await hasCommand('ffprobe');

describe('renderVideo mock output', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cm-mock-render-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.runIf(canRun)('writes a valid MP4 container', async () => {
    const outputPath = join(dir, 'mock.mp4');
    const audioPath = join(dir, 'mock.wav');
    await writeFile(audioPath, Buffer.alloc(0));

    const visuals = {
      schemaVersion: '1.0.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'mock',
          assetPath: 'mock://asset',
          duration: 1,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [
        {
          word: 'test',
          start: 0,
          end: 0.5,
        },
      ],
      totalDuration: 1,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    };

    await renderVideo({
      visuals,
      timestamps,
      audioPath,
      outputPath,
      orientation: 'portrait',
      mock: true,
    });

    await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=format_name',
        '-of',
        'default=noprint_wrappers=1',
        outputPath,
      ],
      { windowsHide: true, timeout: 5000 }
    );

    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_name',
        '-of',
        'default=noprint_wrappers=1',
        outputPath,
      ],
      { windowsHide: true, timeout: 5000 }
    );

    expect(stdout).toContain('codec_name=h264');
  });
});
