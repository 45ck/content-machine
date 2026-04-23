import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

function getRepoRoot(): string {
  const helperDir = dirname(fileURLToPath(import.meta.url));
  return join(helperDir, '..', '..', '..');
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({ code: 124, stdout, stderr: stderr + '\nProcess timed out' });
      } else {
        resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr });
      }
    });
  });
}

describe('dist CLI bundle', () => {
  it('runs `cm --help` without ESM require errors', async () => {
    const repoRoot = getRepoRoot();
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    const build = await runCommand(npmCmd, ['run', 'build'], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      timeoutMs: 120_000,
    });
    expect(build.code).toBe(0);

    const run = await runCommand(process.execPath, ['dist/cli/index.cjs', '--help'], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      timeoutMs: 60_000,
    });

    expect(run.code).toBe(0);
    expect(run.stdout).toContain('Usage: cm');
    expect(run.stderr).not.toContain('ERR_REQUIRE_ESM');

    // E2E smoke test: start Lab compare in one-shot mode, submit, and ensure the process exits.
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-dist-'));
    const allowedRoot = join(base, 'allowed');
    const aDir = join(allowedRoot, 'runA');
    const bDir = join(allowedRoot, 'runB');

    await mkdir(aDir, { recursive: true });
    await mkdir(bDir, { recursive: true });

    await writeFile(join(aDir, 'video.mp4'), Buffer.from('0123456789abcdef'));
    await writeFile(join(bDir, 'video.mp4'), Buffer.from('fedcba9876543210'));
    await writeFile(
      join(aDir, 'script.json'),
      JSON.stringify({ meta: { topic: 'A topic' } }),
      'utf-8'
    );
    await writeFile(
      join(bDir, 'script.json'),
      JSON.stringify({ meta: { topic: 'B topic' } }),
      'utf-8'
    );

    const env = {
      ...process.env,
      NODE_ENV: 'test',
      CM_LAB_ROOT: join(base, 'lab-root'),
      CM_FEEDBACK_STORE_PATH: join(base, 'feedback', 'feedback.jsonl'),
    };

    const labProc = spawn(
      process.execPath,
      [
        'dist/cli/index.cjs',
        '--json',
        'lab',
        'compare',
        aDir,
        bDir,
        '--no-open',
        '--port',
        '0',
        '--allow-root',
        allowedRoot,
      ],
      {
        cwd: repoRoot,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';
    labProc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    labProc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    try {
      const startedAt = Date.now();
      let envelope: any = null;
      while (Date.now() - startedAt < 10_000) {
        try {
          envelope = JSON.parse(stdout);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 25));
        }
      }
      expect(envelope).toBeTruthy();
      expect(envelope.command).toBe('lab');
      expect(envelope.errors).toEqual([]);

      const url = String(envelope.outputs.url);
      const experimentId = String(envelope.outputs.experimentId);
      const baselineRunId = String(envelope.outputs.baselineRunId);
      const variantRunId = String(envelope.outputs.variantRunId);

      const indexRes = await fetch(new URL('/', url));
      expect(indexRes.status).toBe(200);
      const html = await indexRes.text();
      expect(html).toContain('<title>Content Machine Lab</title>');

      const jsRes = await fetch(new URL('/lab/app.js', url));
      expect(jsRes.status).toBe(200);
      expect(jsRes.headers.get('content-type')).toContain('application/javascript');

      const configRes = await fetch(new URL('/api/config', url));
      expect(configRes.status).toBe(200);
      const config = await configRes.json();
      const token = String(config.token);

      const expRes = await fetch(
        new URL(`/api/experiments/${encodeURIComponent(experimentId)}`, url)
      );
      expect(expRes.status).toBe(200);
      const exp = await expRes.json();
      expect(Array.isArray(exp.variants)).toBe(true);
      expect(exp.variants.length).toBeGreaterThan(0);
      const variantId = String(exp.variants[0].variantId);

      const submitRes = await fetch(
        new URL(`/api/experiments/${encodeURIComponent(experimentId)}/submit`, url),
        {
          method: 'POST',
          headers: {
            'X-CM-LAB-TOKEN': token,
            'X-CM-LAB-REQUEST-ID': 'req_1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winnerVariantId: variantId,
            reason: 'B wins',
            perRun: [
              {
                runId: baselineRunId,
                variantId: 'baseline',
                ratings: { overall: 70, captions: 60 },
              },
              { runId: variantRunId, variantId, ratings: { overall: 80, captions: 85 } },
            ],
          }),
        }
      );
      expect(submitRes.status).toBe(200);

      const exitCode = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          labProc.kill('SIGTERM');
          reject(new Error(`Timed out waiting for Lab to exit. stderr:\n${stderr}`));
        }, 5_000);
        labProc.once('close', (code) => {
          clearTimeout(timer);
          resolve(typeof code === 'number' ? code : 1);
        });
      });
      expect(exitCode).toBe(0);
    } finally {
      labProc.kill('SIGTERM');
      await rm(base, { recursive: true, force: true });
    }
  }, 180_000);
});
