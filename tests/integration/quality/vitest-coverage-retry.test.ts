import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const bashPath = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

function toBashPath(path: string): string {
  if (process.platform !== 'win32') {
    return path;
  }

  return path.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive: string) => {
    return `/${drive.toLowerCase()}`;
  });
}

async function hasCommand(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    await execFileAsync(command, args, { windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const canRun = await hasCommand(bashPath);

describe('vitest-coverage-retry.sh', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cm-vitest-retry-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.runIf(canRun)('propagates a failing vitest exit code', async () => {
    const binDir = join(dir, 'fail-bin');
    await mkdir(binDir, { recursive: true });

    const fakeNpxPath = join(binDir, 'npx');
    await writeFile(fakeNpxPath, '#!/bin/sh\necho fail >&2\nexit 17\n', 'utf8');
    await chmod(fakeNpxPath, 0o755);

    const repoRoot = toBashPath(process.cwd());
    const binRoot = toBashPath(binDir);

    await expect(
      execFileAsync(
        bashPath,
        [
          '-lc',
          `cd '${repoRoot}' && PATH="${binRoot}:$PATH" /usr/bin/bash scripts/quality/vitest-coverage-retry.sh`,
        ],
        {
          windowsHide: true,
          timeout: 30_000,
        }
      )
    ).rejects.toMatchObject({
      code: 17,
      stdout: expect.stringContaining('fail'),
    });
  });

  it.runIf(canRun)('retries once on transient coverage shard failures', async () => {
    const binDir = join(dir, 'retry-bin');
    await mkdir(binDir, { recursive: true });

    const counterFile = join(dir, 'attempts.txt');
    const counterPath = toBashPath(counterFile);
    const fakeNpxPath = join(binDir, 'npx');
    await writeFile(
      fakeNpxPath,
      [
        '#!/bin/sh',
        `counter_file='${counterPath}'`,
        'count=0',
        'if [ -f "$counter_file" ]; then count=$(cat "$counter_file"); fi',
        'count=$((count + 1))',
        'printf "%s" "$count" > "$counter_file"',
        'if [ "$count" -eq 1 ]; then',
        '  echo "ENOENT: no such file or directory, open \'coverage/.tmp/coverage-123.json\'" >&2',
        '  exit 1',
        'fi',
        'echo "coverage ok"',
        'exit 0',
        '',
      ].join('\n'),
      'utf8'
    );
    await chmod(fakeNpxPath, 0o755);

    const repoRoot = toBashPath(process.cwd());
    const binRoot = toBashPath(binDir);

    const { stdout, stderr } = await execFileAsync(
      bashPath,
      [
        '-lc',
        `cd '${repoRoot}' && PATH="${binRoot}:$PATH" /usr/bin/bash scripts/quality/vitest-coverage-retry.sh`,
      ],
      {
        windowsHide: true,
        timeout: 30_000,
      }
    );

    expect(stdout).toContain('coverage ok');
    expect(stderr).toContain('Retrying Vitest coverage after transient coverage shard ENOENT');
    await expect(readFile(counterFile, 'utf8')).resolves.toBe('2');
  });
});
