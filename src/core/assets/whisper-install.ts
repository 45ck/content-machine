import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { resolveWhisperExecutablePath } from './whisper';

export interface WhisperInstallerModule {
  installWhisperCpp(params: { to: string; version: string }): Promise<unknown>;
}

/**
 * Ensures the Whisper executable assets exist in the target directory without
 * clobbering an already-downloaded model file.
 */
export async function ensureWhisperExecutableInstalled(params: {
  installer: WhisperInstallerModule;
  dir: string;
  version: string;
}): Promise<void> {
  const dir = path.resolve(params.dir);
  if (resolveWhisperExecutablePath(dir)) {
    return;
  }

  const stagingDir = path.join(
    path.dirname(dir),
    `.cm-whisper-install-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    await params.installer.installWhisperCpp({ to: stagingDir, version: params.version });
    await mkdir(dir, { recursive: true });

    const entries = await readdir(stagingDir);
    for (const entry of entries) {
      await cp(path.join(stagingDir, entry), path.join(dir, entry), {
        recursive: true,
        force: true,
      });
    }
  } finally {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
