import { describe, expect, it } from 'vitest';
import { chromium, firefox, type BrowserType } from 'playwright';
import { existsSync } from 'node:fs';
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
  async function runCompareE2E(params: { browserType: BrowserType; browserName: string }) {
    const base = await mkdtemp(join(tmpdir(), `cm-lab-ui-${params.browserName}-`));
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
    const { renderVideo } = await import('../../src/render/service');

    const allowedRoot = join(base, 'allowed');
    const aDir = join(allowedRoot, 'runA');
    const bDir = join(allowedRoot, 'runB');
    await mkdir(aDir, { recursive: true });
    await mkdir(bDir, { recursive: true });

    // Generate valid MP4s so we can verify metadata loads and linked playback doesn't deadlock.
    // Use mock render mode so this remains fast and deterministic in CI.
    const visuals = {
      schemaVersion: '1.0.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'mock://asset', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'test', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    };

    await renderVideo({
      visuals,
      timestamps,
      audioPath: join(aDir, 'audio.wav'),
      outputPath: join(aDir, 'video.mp4'),
      orientation: 'portrait',
      mock: true,
    });
    await renderVideo({
      visuals,
      timestamps,
      audioPath: join(bDir, 'audio.wav'),
      outputPath: join(bDir, 'video.mp4'),
      orientation: 'portrait',
      mock: true,
    });

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

    const browser = await params.browserType.launch();
    try {
      const page = await browser.newPage();

      const url = `${started.url}#/compare/${encodeURIComponent(experimentId)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1:has-text("Compare")', { timeout: 10_000 });

      // Verify videos load and linked playback is usable.
      await page.waitForSelector('#videoA', { timeout: 10_000 });
      await page.waitForSelector('#videoB', { timeout: 10_000 });
      await page.waitForFunction(
        () => {
          const a = document.getElementById('videoA');
          const b = document.getElementById('videoB');
          if (!(a instanceof HTMLVideoElement) || !(b instanceof HTMLVideoElement)) return false;
          return a.readyState >= 1 && b.readyState >= 1 && a.duration > 0 && b.duration > 0;
        },
        { timeout: 15_000 }
      );

      // Mute both before starting to avoid autoplay restrictions in headless.
      await page.selectOption('#audioSel', 'mute');

      await page.click('#playPause');
      await page.waitForFunction(
        () => {
          const a = document.getElementById('videoA');
          const b = document.getElementById('videoB');
          if (!(a instanceof HTMLVideoElement) || !(b instanceof HTMLVideoElement)) return false;
          return !a.paused && !b.paused;
        },
        { timeout: 10_000 }
      );

      // Allow a bit of time for drift correction to settle, then ensure the videos remain close.
      await page.waitForTimeout(800);
      const drift = await page.evaluate(() => {
        const a = document.getElementById('videoA');
        const b = document.getElementById('videoB');
        if (!(a instanceof HTMLVideoElement) || !(b instanceof HTMLVideoElement)) return 999;
        return Math.abs(a.currentTime - b.currentTime);
      });
      expect(drift).toBeLessThan(0.35);

      // Blind by default: metrics hidden until user reveals.
      expect(await page.isChecked('#revealMetrics')).toBe(false);
      expect(await page.isVisible('#metricsA')).toBe(false);
      expect(await page.isVisible('#metricsB')).toBe(false);

      await page.fill('[data-prefix="a"] .rating[data-key="overall"] .num', '70');
      await page.fill('[data-prefix="a"] .rating[data-key="motion"] .num', '65');
      await page.fill('[data-prefix="b"] .rating[data-key="overall"] .num', '80');
      await page.fill('[data-prefix="b"] .rating[data-key="motion"] .num', '75');
      await page.click('label:has-text("B wins")');
      await page.fill('#reason', 'B is clearer and more engaging');

      await page.click('#submitCompare');
      await page.waitForSelector('#submitMsg .success', { timeout: 10_000 });

      const feedback = await readFeedbackEntries(process.env.CM_FEEDBACK_STORE_PATH);
      const entries = feedback.filter((f) => f.experimentId === experimentId);
      expect(entries.length).toBe(2);
      expect(entries.find((e) => e.runId === a.run.runId)?.ratings?.motion).toBe(65);
      expect(entries.find((e) => e.runId === b.run.runId)?.ratings?.motion).toBe(75);

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
  }

  it('chromium: loads compare UI, keeps metrics blind by default, submits, and auto-closes', async () => {
    await runCompareE2E({ browserType: chromium, browserName: 'chromium' });
  }, 60_000);

  it.runIf(existsSync(firefox.executablePath()))(
    'firefox: loads compare UI, keeps metrics blind by default, submits, and auto-closes',
    async () => {
      await runCompareE2E({ browserType: firefox, browserName: 'firefox' });
    },
    60_000
  );
});
