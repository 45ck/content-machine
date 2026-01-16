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

  it('skips dirs when workflow.json is missing or invalid', async () => {
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

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('good');
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

  it('includes builtin workflows by default and orders project before user', async () => {
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

    expect(results.map((r) => r.id)).toEqual(['builtin', 'proj', 'user']);
  });
});
