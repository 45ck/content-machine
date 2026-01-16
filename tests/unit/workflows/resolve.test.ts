import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SchemaError, NotFoundError } from '../../../src/core/errors';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

async function loadModule() {
  const mod = await import('../../../src/workflows/resolve');
  return mod;
}

describe('workflows resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty specs', async () => {
    const { resolveWorkflow } = await loadModule();
    await expect(resolveWorkflow('')).rejects.toBeInstanceOf(SchemaError);
  });

  it('resolves workflow from a file path', async () => {
    const { existsSync } = await import('fs');
    const { stat, readFile } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) =>
      String(p).includes('workflow.json')
    );
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isDirectory: () => false,
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ id: 'demo', name: 'Demo', steps: [] })
    );

    const { resolveWorkflow } = await loadModule();
    const result = await resolveWorkflow('/tmp/workflow.json');

    expect(result.source).toBe('file');
    expect(result.workflow.id).toBe('demo');
  });

  it('resolves workflow from a directory path', async () => {
    const { existsSync } = await import('fs');
    const { stat, readFile } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isDirectory: () => true,
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ id: 'dir', name: 'Dir', steps: [] })
    );

    const { resolveWorkflow } = await loadModule();
    const result = await resolveWorkflow('/tmp/workflow-dir');

    expect(result.workflow.id).toBe('dir');
    expect(result.workflowPath).toContain('workflow.json');
  });

  it('throws SchemaError for invalid JSON', async () => {
    const { existsSync } = await import('fs');
    const { stat, readFile } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isDirectory: () => false,
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('{bad');

    const { resolveWorkflow } = await loadModule();
    await expect(resolveWorkflow('/tmp/workflow.json')).rejects.toBeInstanceOf(SchemaError);
  });

  it('throws SchemaError for invalid workflow shape', async () => {
    const { existsSync } = await import('fs');
    const { stat, readFile } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isDirectory: () => false,
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ name: 'Missing id' })
    );

    const { resolveWorkflow } = await loadModule();
    await expect(resolveWorkflow('/tmp/workflow.json')).rejects.toBeInstanceOf(SchemaError);
  });

  it('resolves builtin workflows when available', async () => {
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const mod = await loadModule();
    mod.__setBuiltinWorkflows({
      builtin: { id: 'builtin', name: 'Builtin', steps: [] },
    });

    const result = await mod.resolveWorkflow('builtin');
    expect(result.source).toBe('builtin');
    expect(result.workflow.id).toBe('builtin');
  });

  it('searches candidate paths and throws when not found', async () => {
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const mod = await loadModule();
    vi.spyOn(mod, 'getBuiltinWorkflow').mockReturnValue(undefined);

    await expect(mod.resolveWorkflow('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('formats workflow sources', async () => {
    const { formatWorkflowSource } = await loadModule();
    expect(
      formatWorkflowSource({
        source: 'builtin',
        spec: 'x',
        workflow: { id: 'x', name: 'X', steps: [] },
      })
    ).toBe('builtin:x');
    expect(
      formatWorkflowSource({
        source: 'file',
        spec: 'x',
        workflow: { id: 'x', name: 'X', steps: [] },
        workflowPath: '/tmp/workflow.json',
      })
    ).toBe('file:/tmp/workflow.json');
  });
});
