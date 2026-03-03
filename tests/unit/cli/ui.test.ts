import { describe, expect, it, vi } from 'vitest';

async function configureRuntime(update: { json: boolean; isTty: boolean }): Promise<void> {
  const { resetCliRuntime, setCliRuntime } = await import('../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime(update);
}

async function captureOutput(): Promise<{
  stderr: string[];
  stdout: string[];
  reset: () => Promise<void>;
}> {
  const { setOutputWriter } = await import('../../../src/cli/output');
  const stderr: string[] = [];
  const stdout: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 2) stderr.push(String(chunk));
    if (fd === 1) stdout.push(String(chunk));
  });
  return {
    stderr,
    stdout,
    reset: async () => {
      const { setOutputWriter } = await import('../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli ui', () => {
  it('formatKeyValueRows aligns columns', async () => {
    const { formatKeyValueRows } = await import('../../../src/cli/ui');
    expect(
      formatKeyValueRows([
        ['A', '1'],
        ['LongKey', '2'],
      ])
    ).toEqual(['A:       1', 'LongKey: 2']);
  });

  it('writeSummaryCard is a no-op in json mode', async () => {
    await configureRuntime({ json: true, isTty: true });

    const capture = await captureOutput();

    const { writeSummaryCard } = await import('../../../src/cli/ui');
    await writeSummaryCard({ title: 'Title', lines: ['Line 1'] });

    await capture.reset();
    expect(capture.stdout).toEqual([]);
    expect(capture.stderr).toEqual([]);
  });

  it('writeSummaryCard prints plain lines when not a TTY', async () => {
    await configureRuntime({ json: false, isTty: false });

    const capture = await captureOutput();

    const { writeSummaryCard } = await import('../../../src/cli/ui');
    await writeSummaryCard({
      title: 'Card',
      lines: ['One', 'Two'],
      footerLines: ['Foot'],
    });

    await capture.reset();

    const joined = capture.stderr.join('');
    expect(joined).toContain('Card');
    expect(joined).toContain('One');
    expect(joined).toContain('Two');
    expect(joined).toContain('Foot');
  });

  it('writeSummaryCard falls back when boxen cannot be imported', async () => {
    vi.resetModules();
    vi.doMock('boxen', () => {
      throw new Error('boxen missing');
    });

    await configureRuntime({ json: false, isTty: true });

    const capture = await captureOutput();

    const { writeSummaryCard, __setCachedBoxen } = await import('../../../src/cli/ui');
    __setCachedBoxen(undefined);
    await writeSummaryCard({ title: 'Card', lines: ['Line'] });

    await capture.reset();

    const joined = capture.stderr.join('');
    expect(joined).toContain('Card');
    expect(joined).toContain('Line');
    vi.unmock('boxen');
  });

  it('writeSummaryCard uses boxen when available (and caches it)', async () => {
    vi.resetModules();
    const boxen = vi.fn((text: string) => `BOXED(${text})`);

    await configureRuntime({ json: false, isTty: true });

    const capture = await captureOutput();

    const { writeSummaryCard, __setCachedBoxen } = await import('../../../src/cli/ui');
    __setCachedBoxen(boxen);
    await writeSummaryCard({ title: 'Card', lines: ['Line'] });
    await writeSummaryCard({ title: 'Card2', lines: ['Line2'] });

    await capture.reset();

    expect(boxen).toHaveBeenCalled();
    expect(capture.stderr.join('')).toContain('BOXED(');
  });
});
