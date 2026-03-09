import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureWhisperExecutableInstalled } from '../../../../src/core/assets/whisper-install';

function whisperBinaryName(): string {
  return process.platform === 'win32' ? 'main.exe' : 'main';
}

function whisperBinaryContents(): Buffer | string {
  return process.platform === 'win32' ? Buffer.from('MZ-whisper-stub') : 'stub';
}

describe('ensureWhisperExecutableInstalled', () => {
  it('does nothing when a runnable whisper executable already exists', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cm-whisper-install-existing-'));
    const dir = path.join(root, 'whisper');
    const binaryPath = path.join(dir, whisperBinaryName());
    const installer = {
      installWhisperCpp: vi.fn(),
    };

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(binaryPath, whisperBinaryContents());

      await ensureWhisperExecutableInstalled({
        installer,
        dir,
        version: '1.5.5',
      });

      expect(installer.installWhisperCpp).not.toHaveBeenCalled();
      expect(existsSync(binaryPath)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('installs whisper into a staging dir and merges binaries into an existing asset dir', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'cm-whisper-install-stage-'));
    const dir = path.join(root, 'whisper');
    const modelPath = path.join(dir, 'ggml-base.bin');
    const binaryPath = path.join(dir, whisperBinaryName());
    const dllPath = path.join(dir, 'whisper.dll');
    const installer = {
      installWhisperCpp: vi.fn(async ({ to }: { to: string }) => {
        await mkdir(to, { recursive: true });
        await writeFile(path.join(to, whisperBinaryName()), whisperBinaryContents());
        await writeFile(path.join(to, 'whisper.dll'), 'dll-stub');
      }),
    };

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(modelPath, 'model-stub');

      await ensureWhisperExecutableInstalled({
        installer,
        dir,
        version: '1.5.5',
      });

      expect(installer.installWhisperCpp).toHaveBeenCalledTimes(1);
      expect(existsSync(modelPath)).toBe(true);
      expect(existsSync(binaryPath)).toBe(true);
      expect(existsSync(dllPath)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
