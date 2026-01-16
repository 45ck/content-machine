import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateRequirements, planWhisperRequirements } from './requirements';

describe('assets requirements', () => {
  it('evaluates whisper requirements as ok when model and binary exist', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'cm-whisper-'));
    try {
      writeFileSync(path.join(tmpDir, 'ggml-base.bin'), 'stub', 'utf-8');
      writeFileSync(
        path.join(tmpDir, process.platform === 'win32' ? 'main.exe' : 'main'),
        'stub',
        'utf-8'
      );

      const requirements = planWhisperRequirements({ required: true, model: 'base', dir: tmpDir });
      const results = await evaluateRequirements(requirements);

      expect(results.every((r) => r.ok)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('evaluates whisper requirements as not ok when missing', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'cm-whisper-'));
    try {
      const requirements = planWhisperRequirements({ required: true, model: 'base', dir: tmpDir });
      const results = await evaluateRequirements(requirements);

      expect(results.some((r) => r.ok)).toBe(false);
      expect(results.find((r) => r.id === 'whisper:model:base')?.ok).toBe(false);
      expect(results.find((r) => r.id === 'whisper:binary')?.ok).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns empty requirements when not required', () => {
    const requirements = planWhisperRequirements({ required: false, model: 'base' });
    expect(requirements).toEqual([]);
  });

  it('detects whisper-cli binary path in build/bin', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'cm-whisper-'));
    try {
      writeFileSync(path.join(tmpDir, 'ggml-base.bin'), 'stub', 'utf-8');
      const binDir = path.join(tmpDir, 'build', 'bin');
      mkdirSync(binDir, { recursive: true });
      writeFileSync(
        path.join(binDir, process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'),
        'stub',
        'utf-8'
      );

      const requirements = planWhisperRequirements({ required: true, model: 'base', dir: tmpDir });
      const results = await evaluateRequirements(requirements);

      expect(results.every((r) => r.ok)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
