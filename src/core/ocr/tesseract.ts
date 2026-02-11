import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CMError } from '../errors';

function resolveTesseractCacheDir(): string {
  // Keep OCR caches namespaced so they are easy to find/clean.
  return join(process.cwd(), '.cache', 'content-machine', 'tesseract');
}

async function ensureLocalEngTrainedData(langDir: string): Promise<void> {
  // Best-effort: if the repo ships eng.traineddata, prefer it over a network fetch.
  const localEng = join(process.cwd(), 'eng.traineddata');
  if (!existsSync(localEng)) return;

  const dest = join(langDir, 'eng.traineddata');
  if (existsSync(dest)) return;

  try {
    const { copyFile } = await import('node:fs/promises');
    await copyFile(localEng, dest);
  } catch {
    // ignore: tesseract.js will fall back to its own download/cache behavior.
  }
}

export async function createTesseractWorkerEng(params: {
  dependencyMessage: string;
}): Promise<{ worker: any; cacheDir: string }> {
  let Tesseract: typeof import('tesseract.js');
  try {
    Tesseract = await import('tesseract.js');
  } catch {
    throw new CMError('DEPENDENCY_MISSING', params.dependencyMessage, {
      install: 'npm install tesseract.js',
    });
  }

  const cacheDir = resolveTesseractCacheDir();
  await mkdir(cacheDir, { recursive: true });
  await ensureLocalEngTrainedData(cacheDir);

  const worker = await Tesseract.createWorker('eng', undefined, {
    cachePath: cacheDir,
    langPath: cacheDir,
  } as any);

  return { worker, cacheDir };
}
