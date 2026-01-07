import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('CLI stdout/stderr contract (mock pipeline commands)', () => {
  it('script/audio/visuals/render keep stdout parseable', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'stdout-contract-pipeline');
    mkdirSync(outDir, { recursive: true });

    const scriptPath = join(outDir, 'script.json');
    const audioPath = join(outDir, 'audio.wav');
    const timestampsPath = join(outDir, 'timestamps.json');
    const visualsPath = join(outDir, 'visuals.json');
    const videoPath = join(outDir, 'video.mp4');

    const scriptResult = await runCli(
      ['script', '--topic', 'Redis', '--mock', '-o', scriptPath],
      undefined,
      120000
    );
    expect(scriptResult.code).toBe(0);
    expect(scriptResult.stdout.trim()).toBe(scriptPath);
    expect(scriptResult.stderr).toContain('Script:');

    const audioResult = await runCli(
      [
        'audio',
        '--input',
        scriptPath,
        '--mock',
        '--output',
        audioPath,
        '--timestamps',
        timestampsPath,
      ],
      undefined,
      120000
    );
    expect(audioResult.code).toBe(0);
    expect(audioResult.stdout.trim()).toBe(audioPath);
    expect(audioResult.stderr).toContain('Audio:');

    const visualsResult = await runCli(
      ['visuals', '--input', timestampsPath, '--mock', '--output', visualsPath],
      undefined,
      120000
    );
    expect(visualsResult.code).toBe(0);
    expect(visualsResult.stdout.trim()).toBe(visualsPath);
    expect(visualsResult.stderr).toContain('Visuals:');

    const renderResult = await runCli(
      [
        'render',
        '--input',
        visualsPath,
        '--timestamps',
        timestampsPath,
        '--audio',
        audioPath,
        '--mock',
        '--output',
        videoPath,
      ],
      undefined,
      120000
    );
    expect(renderResult.code).toBe(0);
    expect(renderResult.stdout.trim()).toBe(videoPath);
    expect(renderResult.stderr).toContain('Video:');
  }, 180_000);
});
