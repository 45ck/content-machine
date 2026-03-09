import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../src/core/logger', () => ({
  createLogger: vi.fn(() => ({ warn: vi.fn() })),
}));

vi.mock('../../../src/workflows/resolve', () => ({
  listBuiltinWorkflows: vi.fn(),
}));

describe('workflows registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces invalid workflows instead of silently skipping them', async () => {
    const { existsSync } = await import('fs');
    const { readdir, readFile } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return String(p).includes('root') || String(p).includes('good');
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'good', isDirectory: () => true },
      { name: 'bad', isDirectory: () => true },
    ]);
    (readFile as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).includes('good')) {
        return Promise.resolve(JSON.stringify({ id: 'good', name: 'Good', steps: [] }));
      }
      return Promise.resolve('{invalid');
    });

    const { listWorkflows } = await import('../../../src/workflows/registry');
    const results = await listWorkflows({ includeBuiltin: false, userDir: '/root' });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('good');
    expect(results[0].valid).toBe(true);
    expect(results[1]).toEqual(
      expect.objectContaining({
        id: 'bad',
        source: 'user',
        valid: false,
      })
    );
  });

  it('returns empty when directories do not exist', async () => {
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { listWorkflows } = await import('../../../src/workflows/registry');
    const results = await listWorkflows({
      includeBuiltin: false,
      userDir: '/missing',
      projectDir: '/missing',
    });

    expect(results).toEqual([]);
  });

  it('includes builtin workflows by default after effective local precedence', async () => {
    const { existsSync } = await import('fs');
    const { readdir, readFile } = await import('fs/promises');
    const { listBuiltinWorkflows } = await import('../../../src/workflows/resolve');

    (listBuiltinWorkflows as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'builtin', name: 'Builtin', steps: [] },
    ]);

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return (
        String(p).includes('project') ||
        String(p).includes('user') ||
        String(p).includes('workflow.json')
      );
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).includes('project')) {
        return Promise.resolve([{ name: 'proj', isDirectory: () => true }]);
      }
      return Promise.resolve([{ name: 'user', isDirectory: () => true }]);
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).includes('project')) {
        return Promise.resolve(JSON.stringify({ id: 'proj', name: 'Project', steps: [] }));
      }
      return Promise.resolve(JSON.stringify({ id: 'user', name: 'User', steps: [] }));
    });

    const { listWorkflows } = await import('../../../src/workflows/registry');
    const results = await listWorkflows({ projectDir: '/project', userDir: '/user' });

    expect(results.map((r) => r.id)).toEqual(['proj', 'user', 'builtin']);
  });

  it('returns only the effective workflow when a local workflow overrides a builtin id', async () => {
    const { existsSync } = await import('fs');
    const { readdir, readFile } = await import('fs/promises');
    const { listBuiltinWorkflows } = await import('../../../src/workflows/resolve');

    (listBuiltinWorkflows as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'brainrot-gameplay', name: 'Builtin Brainrot', steps: [] },
    ]);

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return String(p).includes('project') || String(p).includes('workflow.json');
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (String(p).includes('project')) {
        return Promise.resolve([{ name: 'brainrot-gameplay', isDirectory: () => true }]);
      }
      return Promise.resolve([]);
    });
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ id: 'brainrot-gameplay', name: 'Project Brainrot', steps: [] })
    );

    const { listWorkflows } = await import('../../../src/workflows/registry');
    const results = await listWorkflows({ projectDir: '/project', userDir: '/user' });

    expect(results).toEqual([
      expect.objectContaining({
        id: 'brainrot-gameplay',
        name: 'Project Brainrot',
        source: 'project',
        valid: true,
      }),
    ]);
  });

  it('keeps an invalid local override ahead of the builtin it shadows', async () => {
    const { existsSync } = await import('fs');
    const { readdir, readFile } = await import('fs/promises');
    const { listBuiltinWorkflows } = await import('../../../src/workflows/resolve');

    (listBuiltinWorkflows as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { id: 'brainrot-gameplay', name: 'Builtin Brainrot', steps: [] },
    ]);

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return String(p).includes('project') || String(p).includes('workflow.json');
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'brainrot-gameplay', isDirectory: () => true },
    ]);
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('{invalid');

    const { listWorkflows } = await import('../../../src/workflows/registry');
    const results = await listWorkflows({ projectDir: '/project', userDir: '/user' });

    expect(results).toEqual([
      expect.objectContaining({
        id: 'brainrot-gameplay',
        source: 'project',
        valid: false,
      }),
    ]);
  });
});
