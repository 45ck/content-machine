import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { runCli } from './helpers';

describe('cm package', () => {
  it('writes a valid packaging artifact in mock mode', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });
    const outPath = join(tmpDir, 'packaging.json');

    const result = await runCli([
      'package',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '-o',
      outPath,
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(outPath);

    const raw = readFileSync(outPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(typeof parsed.schemaVersion).toBe('string');
    expect(parsed.topic).toBe('Redis vs PostgreSQL for caching');
    expect(parsed.platform).toBe('tiktok');
    expect(Array.isArray(parsed.variants)).toBe(true);
    expect(typeof (parsed.selected as Record<string, unknown>).title).toBe('string');
  });

  it('supports --select to choose which variant becomes selected (1-based)', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });
    const outPath = join(tmpDir, 'packaging-select.json');

    const result = await runCli([
      'package',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '--variants',
      '5',
      '--select',
      '2',
      '-o',
      outPath,
    ]);
    expect(result.code).toBe(0);

    const raw = readFileSync(outPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      selectedIndex: number;
      variants: Array<{ title: string }>;
      selected: { title: string };
    };
    expect(parsed.selectedIndex).toBe(1);
    expect(parsed.selected.title).toBe(parsed.variants[1].title);
  });

  it('supports JSON mode without polluting stdout', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });
    const outPath = join(tmpDir, 'packaging-json-envelope.json');

    const result = await runCli([
      'package',
      'Redis vs PostgreSQL for caching',
      '--mock',
      '--json',
      '-o',
      outPath,
    ]);

    expect(result.code).toBe(0);
    const envelope = JSON.parse(result.stdout) as {
      command: string;
      outputs: Record<string, unknown>;
    };
    expect(envelope.command).toBe('package');
    expect(envelope.outputs.packagingPath).toBe(outPath);
  });
});
