import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('CLI UX: Next-step hints (pipeline commands)', () => {
  it('script/audio/visuals/render print a Next: hint in human mode', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'next-steps-pipeline');
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
    expect(scriptResult.stderr).toContain('Next:');
    expect(scriptResult.stderr).toContain('cm audio');

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
    expect(audioResult.stderr).toContain('Next:');
    expect(audioResult.stderr).toContain('cm visuals');

    const visualsResult = await runCli(
      ['visuals', '--input', timestampsPath, '--mock', '--output', visualsPath],
      undefined,
      120000
    );
    expect(visualsResult.code).toBe(0);
    expect(visualsResult.stderr).toContain('Next:');
    expect(visualsResult.stderr).toContain('cm render');

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
    expect(renderResult.stderr).toContain('Next:');
    expect(renderResult.stderr).toContain('cm validate');
  }, 180_000);
});
