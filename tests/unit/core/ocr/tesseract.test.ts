import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('createTesseractWorkerEng', () => {
  it('throws DEPENDENCY_MISSING when tesseract.js cannot be imported', async () => {
    vi.resetModules();
    vi.doMock('tesseract.js', () => {
      throw new Error('missing');
    });

    const { createTesseractWorkerEng } = await import('../../../../src/core/ocr/tesseract');
    await expect(
      createTesseractWorkerEng({ dependencyMessage: 'tesseract needed' })
    ).rejects.toMatchObject({ code: 'DEPENDENCY_MISSING' });
  });

  it('creates a worker and returns cacheDir', async () => {
    vi.resetModules();
    const createWorker = vi.fn(async () => ({ terminate: vi.fn() }));
    vi.doMock('tesseract.js', () => ({ createWorker }));

    const { createTesseractWorkerEng } = await import('../../../../src/core/ocr/tesseract');
    const res = await createTesseractWorkerEng({ dependencyMessage: 'tesseract needed' });

    expect(typeof res.cacheDir).toBe('string');
    expect(res.cacheDir).toContain('.cache');
    expect(res.worker).toBeTruthy();
    expect(createWorker).toHaveBeenCalled();
  });

  it('copies local eng.traineddata into the cache dir when present', async () => {
    vi.resetModules();
    const createWorker = vi.fn(async () => ({ terminate: vi.fn() }));
    vi.doMock('tesseract.js', () => ({ createWorker }));

    const prevCwd = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'cm-tess-'));
    try {
      process.chdir(dir);
      writeFileSync(join(dir, 'eng.traineddata'), 'dummy', 'utf8');

      const { createTesseractWorkerEng } = await import('../../../../src/core/ocr/tesseract');
      const res = await createTesseractWorkerEng({ dependencyMessage: 'tesseract needed' });

      expect(existsSync(join(res.cacheDir, 'eng.traineddata'))).toBe(true);
    } finally {
      process.chdir(prevCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
