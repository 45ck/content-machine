import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { runCli } from './helpers';

describe('cm script --package', () => {
  it('injects selected packaging into script.extra.virality.packaging', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });

    const packagingPath = join(tmpDir, 'packaging-for-script.json');
    const scriptPath = join(tmpDir, 'script-with-packaging.json');

    const packageResult = await runCli([
      'package',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '-o',
      packagingPath,
    ]);
    expect(packageResult.code).toBe(0);

    const scriptResult = await runCli([
      'script',
      '--topic',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '--package',
      packagingPath,
      '-o',
      scriptPath,
    ]);
    expect(scriptResult.code).toBe(0);

    const packagingRaw = JSON.parse(readFileSync(packagingPath, 'utf-8')) as {
      selected: { title: string; coverText: string; onScreenHook: string };
    };
    const scriptRaw = JSON.parse(readFileSync(scriptPath, 'utf-8')) as {
      title?: string;
      extra?: { virality?: { packaging?: unknown } };
    };

    expect(scriptRaw.title).toBe(packagingRaw.selected.title);
    expect(scriptRaw.extra?.virality?.packaging).toEqual(packagingRaw.selected);
  });

  it('returns a schema error when packaging file is invalid', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });

    const badPackagingPath = join(tmpDir, 'bad-packaging.json');
    writeFileSync(badPackagingPath, JSON.stringify({ not: 'valid' }, null, 2), 'utf-8');

    const result = await runCli([
      'script',
      '--topic',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '--json',
      '--package',
      badPackagingPath,
    ]);

    expect(result.code).toBe(2);
    const envelope = JSON.parse(result.stdout) as {
      errors: Array<{ code: string; message: string; context?: Record<string, unknown> }>;
    };
    expect(envelope.errors[0]?.code).toBe('SCHEMA_ERROR');
    expect(envelope.errors[0]?.context?.fix).toContain('cm package');
  });
});

