import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/workflows/registry', () => ({
  listWorkflows: vi.fn(),
}));

vi.mock('../../../../src/workflows/resolve', () => ({
  resolveWorkflow: vi.fn(),
  formatWorkflowSource: vi.fn(),
}));

vi.mock('../../../../src/workflows/installer', () => ({
  installWorkflowPack: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }): Promise<void> {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput(): Promise<{
  stderr: string[];
  stdout: string[];
  reset: () => Promise<void>;
}> {
  const { setOutputWriter } = await import('../../../../src/cli/output');
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
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli workflows command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints a message when no workflows exist', async () => {
    const { listWorkflows } = await import('../../../../src/workflows/registry');
    (listWorkflows as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { workflowsCommand } = await import('../../../../src/cli/commands/workflows');
    await workflowsCommand.parseAsync(['list'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('No workflows found.');
  });

  it('outputs list JSON in json mode', async () => {
    const { listWorkflows } = await import('../../../../src/workflows/registry');
    (listWorkflows as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'basic', name: 'Basic', description: 'Demo', source: 'builtin' },
    ]);

    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { workflowsCommand } = await import('../../../../src/cli/commands/workflows');
    await workflowsCommand.parseAsync(['list'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('workflows:list');
    expect(payload.outputs.workflows.length).toBe(1);
  });

  it('shows workflow details in human mode', async () => {
    const { resolveWorkflow, formatWorkflowSource } =
      await import('../../../../src/workflows/resolve');
    (formatWorkflowSource as unknown as ReturnType<typeof vi.fn>).mockReturnValue('builtin');
    (resolveWorkflow as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      workflow: { id: 'demo', steps: [] },
      source: 'builtin',
      workflowPath: '/tmp/workflow.json',
    });

    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { workflowsCommand } = await import('../../../../src/cli/commands/workflows');
    await workflowsCommand.parseAsync(['show', 'demo'], { from: 'user' });

    await capture.reset();
    const joined = capture.stderr.join('');
    expect(joined).toContain('Workflow: demo');
    expect(joined).toContain('Source: /tmp/workflow.json');
    expect(joined).toContain('"id": "demo"');
  });

  it('validates workflows in json mode', async () => {
    const { resolveWorkflow } = await import('../../../../src/workflows/resolve');
    (resolveWorkflow as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      workflow: { id: 'demo', steps: [] },
      source: 'builtin',
      workflowPath: '/tmp/workflow.json',
    });

    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { workflowsCommand } = await import('../../../../src/cli/commands/workflows');
    await workflowsCommand.parseAsync(['validate', '/tmp/workflow.json'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('workflows:validate');
    expect(payload.outputs.valid).toBe(true);
  });

  it('installs workflow packs in human mode', async () => {
    const { installWorkflowPack } = await import('../../../../src/workflows/installer');
    (installWorkflowPack as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'demo',
      installPath: '/home/calvin/.cm/workflows/demo',
    });

    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { workflowsCommand } = await import('../../../../src/cli/commands/workflows');
    await workflowsCommand.parseAsync(['install', '/tmp/demo.zip'], {
      from: 'user',
    });

    await capture.reset();
    const joined = capture.stderr.join('');
    expect(joined).toContain('Installed workflow: demo');
    expect(joined).toContain('Location: /home/calvin/.cm/workflows/demo');
  });
});
