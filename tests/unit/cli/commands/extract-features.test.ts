import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start: function () {
      return this;
    },
    succeed: function () {
      return this;
    },
    fail: function () {
      return this;
    },
    stop: function () {
      return this;
    },
  })),
}));

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
  writeOutputFile: vi.fn(async () => undefined),
}));

vi.mock('../../../../src/quality-score/feature-extractor', () => ({
  extractFeatures: vi.fn(async () => ({ videoId: 'video-1' })),
}));

const runtimeState = {
  json: false,
  verbose: false,
  offline: false,
  yes: false,
  isTty: false,
  startTime: Date.now(),
  command: undefined as string | undefined,
};

vi.mock('../../../../src/cli/runtime', () => ({
  getCliRuntime: () => runtimeState,
  setCliRuntime: (update: Partial<typeof runtimeState>) => Object.assign(runtimeState, update),
  resetCliRuntime: () => {
    runtimeState.json = false;
    runtimeState.verbose = false;
    runtimeState.offline = false;
    runtimeState.yes = false;
    runtimeState.isTty = false;
    runtimeState.startTime = Date.now();
    runtimeState.command = undefined;
  },
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stdout,
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli extract-features command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('prints output path to stdout in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { extractFeaturesCommand } =
      await import('../../../../src/cli/commands/extract-features');
    await extractFeaturesCommand.parseAsync(['-i', 'video.mp4'], { from: 'user' });

    await capture.reset();
    expect(capture.stdout.join('')).toContain('features.json');
  });

  it('emits a json envelope in --json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { extractFeaturesCommand } =
      await import('../../../../src/cli/commands/extract-features');
    await extractFeaturesCommand.parseAsync(['-i', 'video.mp4', '-o', 'out.json'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('extract-features');
    expect(payload.outputs.featuresPath).toBe('out.json');
  });

  it('batch mode scans a directory and writes outputs', async () => {
    await configureRuntime({ json: false });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-extract-features-'));
    const videosDir = path.join(tmpDir, 'videos');
    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(videosDir, { recursive: true });
    fs.writeFileSync(path.join(videosDir, 'a.mp4'), Buffer.from('fake'));
    fs.writeFileSync(path.join(videosDir, 'timestamps.json'), JSON.stringify({}));

    const capture = await captureOutput();
    const { extractFeaturesCommand } =
      await import('../../../../src/cli/commands/extract-features');
    await extractFeaturesCommand.parseAsync(['--batch', videosDir, '-o', outDir], { from: 'user' });

    await capture.reset();
    expect(capture.stdout.join('')).toContain(outDir);
  });

  it('exits with code 1 when no input is provided', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { extractFeaturesCommand } =
      await import('../../../../src/cli/commands/extract-features');
    await extractFeaturesCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
