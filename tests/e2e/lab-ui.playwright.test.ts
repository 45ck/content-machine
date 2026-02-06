import { describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms: ${label}`)), timeoutMs);
    }),
  ]);
}

describe('Experiment Lab UI (Playwright)', () => {
  it('loads compare UI, keeps metrics blind by default, submits, and auto-closes', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-ui-'));
    const prevLabRoot = process.env.CM_LAB_ROOT;
    const prevFeedbackStore = process.env.CM_FEEDBACK_STORE_PATH;

    process.env.CM_LAB_ROOT = join(base, 'lab-root');
    process.env.CM_FEEDBACK_STORE_PATH = join(base, 'feedback', 'feedback.jsonl');

    const { startLabServer } = await import('../../src/lab/server/server');
    const { createLabSession } = await import('../../src/lab/session/session');
    const { resolveAllowedRoots } = await import('../../src/lab/security/path');
    const { importLabRunFromPath } = await import('../../src/lab/services/runs');
    const { labExperimentsStorePath } = await import('../../src/lab/paths');
    const { appendExperiment, generateExperimentId, generateVariantId } =
      await import('../../src/lab/stores/experiments-store');
    const { LabExperimentSchema } = await import('../../src/domain');
    const { readFeedbackEntries } = await import('../../src/feedback/store');

    const allowedRoot = join(base, 'allowed');
    const aDir = join(allowedRoot, 'runA');
    const bDir = join(allowedRoot, 'runB');
    await mkdir(aDir, { recursive: true });
    await mkdir(bDir, { recursive: true });

    // Tiny bytes are fine here: we only verify the UI renders and can submit.
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

    const allowedRoots = await resolveAllowedRoots([allowedRoot]);
    const session = createLabSession();

    const a = await importLabRunFromPath({ session, allowedRoots, inputPath: aDir });
    const b = await importLabRunFromPath({ session, allowedRoots, inputPath: bDir });

    const experimentId = generateExperimentId();
    const variantId = generateVariantId();

    const exp = LabExperimentSchema.parse({
      schemaVersion: 1,
      experimentId,
      sessionId: session.sessionId,
      createdAt: new Date().toISOString(),
      name: 'UI E2E',
      hypothesis: 'B should win',
      topic: a.run.topic ?? b.run.topic,
      baselineRunId: a.run.runId,
      variants: [{ variantId, label: 'B', runId: b.run.runId }],
      status: 'queued',
    });
    await appendExperiment(labExperimentsStorePath(), exp);

    const started = await startLabServer({
      host: '127.0.0.1',
      port: 0,
      session,
      allowedRoots,
      task: { type: 'compare', experimentId },
      exitAfterSubmit: 1,
    });

    const serverClosed = new Promise<void>((resolve) => {
      started.server.once('close', () => resolve());
    });

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();

      const url = `${started.url}#/compare/${encodeURIComponent(experimentId)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1:has-text("Compare")', { timeout: 10_000 });

      // Blind by default: metrics hidden until user reveals.
      expect(await page.isChecked('#revealMetrics')).toBe(false);
      expect(await page.isVisible('#metricsA')).toBe(false);
      expect(await page.isVisible('#metricsB')).toBe(false);

      await page.fill('[data-prefix="a"] .rating[data-key="overall"] .num', '70');
      await page.fill('[data-prefix="b"] .rating[data-key="overall"] .num', '80');
      await page.click('label:has-text("B wins")');
      await page.fill('#reason', 'B is clearer and more engaging');

      await page.click('#submitCompare');
      await page.waitForSelector('#submitMsg .success', { timeout: 10_000 });

      const feedback = await readFeedbackEntries(process.env.CM_FEEDBACK_STORE_PATH);
      expect(feedback.filter((f) => f.experimentId === experimentId).length).toBe(2);

      await withTimeout(serverClosed, 15_000, 'Lab server auto-close after submit');
    } finally {
      await browser.close();
      await started.close();
      await rm(base, { recursive: true, force: true });

      if (prevLabRoot === undefined) delete process.env.CM_LAB_ROOT;
      else process.env.CM_LAB_ROOT = prevLabRoot;
      if (prevFeedbackStore === undefined) delete process.env.CM_FEEDBACK_STORE_PATH;
      else process.env.CM_FEEDBACK_STORE_PATH = prevFeedbackStore;
    }
  }, 60_000);
});
