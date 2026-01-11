import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { CMError } from '../core/errors';
import type { HookDefinition } from './schema';

export interface DownloadHookOptions {
  destinationPath: string;
  force?: boolean;
  offline?: boolean;
}

export async function downloadHookClip(
  hook: HookDefinition,
  options: DownloadHookOptions
): Promise<{ downloaded: boolean; path: string }> {
  const { destinationPath, force, offline } = options;

  if (!force && existsSync(destinationPath)) {
    return { downloaded: false, path: destinationPath };
  }

  if (offline) {
    throw new CMError('OFFLINE', 'Offline mode enabled; cannot download hook clips', {
      fix: 'Run without --offline to allow downloads',
    });
  }

  const response = await fetch(hook.url);
  if (!response.ok) {
    throw new Error(
      `Failed to download hook ${hook.id}: HTTP ${response.status} ${response.statusText}`
    );
  }
  if (!response.body) {
    throw new Error(`Failed to download hook ${hook.id}: empty response body`);
  }

  await mkdir(dirname(destinationPath), { recursive: true });

  const tmpPath = `${destinationPath}.part`;
  await rm(tmpPath, { force: true }).catch(() => {});

  const readable = Readable.fromWeb(response.body as any);
  await pipeline(readable, createWriteStream(tmpPath));
  await rename(tmpPath, destinationPath);

  return { downloaded: true, path: destinationPath };
}
