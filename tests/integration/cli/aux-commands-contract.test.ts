import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('CLI stdout/stderr contract (aux commands)', () => {
  it('score/publish/retrieve/rate keep stdout parseable', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'aux-contract');
    mkdirSync(outDir, { recursive: true });

    const scriptPath = join(outDir, 'script.json');
    const scorePath = join(outDir, 'score.json');
    const publishPath = join(outDir, 'publish.json');
    const indexPath = join(outDir, 'research.index.json');
    const retrievePath = join(outDir, 'retrieve.json');
    const videoPath = join(outDir, 'video.mp4');
    const ratePath = join(outDir, 'rate.json');

    const scriptResult = await runCli(
      ['script', '--topic', 'Redis', '--mock', '-o', scriptPath],
      undefined,
      120000
    );
    expect(scriptResult.code).toBe(0);

    const scoreResult = await runCli(
      ['score', '--input', scriptPath, '--output', scorePath, '--min-overall', '0'],
      undefined,
      120000
    );
    expect(scoreResult.code).toBe(0);
    expect(scoreResult.stdout.trim()).toBe(scorePath);
    expect(scoreResult.stderr).toContain('Score:');

    const publishResult = await runCli(
      ['publish', '--input', scriptPath, '--mock', '--output', publishPath],
      undefined,
      120000
    );
    expect(publishResult.code).toBe(0);
    expect(publishResult.stdout.trim()).toBe(publishPath);
    expect(publishResult.stderr).toContain('Publish:');

    writeFileSync(
      indexPath,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          dimensions: 8,
          items: [
            {
              id: 'evidence:0',
              embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
              evidence: {
                title: 'Redis caching tips',
                url: 'https://example.com/redis',
                source: 'web',
                relevanceScore: 0.9,
                summary: 'Short summary',
              },
            },
          ],
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );

    const retrieveResult = await runCli(
      [
        'retrieve',
        '--index',
        indexPath,
        '--query',
        'redis cache',
        '--k',
        '1',
        '--output',
        retrievePath,
      ],
      undefined,
      120000
    );
    expect(retrieveResult.code).toBe(0);
    expect(retrieveResult.stdout.trim()).toBe(retrievePath);
    expect(retrieveResult.stderr).toContain('Query:');

    writeFileSync(videoPath, 'mock video', 'utf-8');
    const rateResult = await runCli(
      ['rate', '--input', videoPath, '--mock', '--output', ratePath, '--min-rating', '0'],
      undefined,
      120000
    );
    expect(rateResult.code).toBe(0);
    expect(rateResult.stdout.trim()).toBe(ratePath);
    expect(rateResult.stderr).toContain('SYNC RATING REPORT');
  }, 240_000);
});
