import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CMError, NotFoundError, SchemaError } from '../../../src/core/errors';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  cp: vi.fn(),
  mkdtemp: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('adm-zip', () => ({
  default: vi.fn(),
}));

async function loadModule() {
  return import('../../../src/workflows/installer');
}

describe('workflows installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when source path does not exist', async () => {
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/missing', destDir: '/dest' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects non-zip files when source is a file', async () => {
    const { existsSync } = await import('fs');
    const { stat } = await import('fs/promises');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isFile: () => true });

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/tmp/workflow.txt', destDir: '/dest' })
    ).rejects.toBeInstanceOf(CMError);
  });

  it('rejects unsafe zip entries', async () => {
    const { existsSync } = await import('fs');
    const { stat, mkdtemp } = await import('fs/promises');
    const AdmZip = (await import('adm-zip')).default as unknown as ReturnType<typeof vi.fn>;

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isFile: () => true });
    (mkdtemp as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('/tmp/cm-workflow-123');

    AdmZip.mockImplementation(() => ({
      getEntries: () => [
        { isDirectory: false, entryName: '../evil', getData: () => Buffer.from('x') },
      ],
    }));

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/tmp/workflow.zip', destDir: '/dest' })
    ).rejects.toBeInstanceOf(CMError);
  });

  it('rejects zip entries that escape the temp dir', async () => {
    const { existsSync } = await import('fs');
    const { stat, mkdtemp } = await import('fs/promises');
    const AdmZip = (await import('adm-zip')).default as unknown as ReturnType<typeof vi.fn>;

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ isFile: () => true });
    (mkdtemp as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('/tmp/cm-workflow-123');

    AdmZip.mockImplementation(() => ({
      getEntries: () => [
        { isDirectory: false, entryName: '/abs.txt', getData: () => Buffer.from('x') },
      ],
    }));

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/tmp/workflow.zip', destDir: '/dest' })
    ).rejects.toBeInstanceOf(CMError);
  });

  it('throws when workflow.json is missing in a directory', async () => {
    const { existsSync } = await import('fs');
    const { stat, readdir } = await import('fs/promises');

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      const str = String(p);
      if (str.includes('workflow.json')) return false;
      return str.includes('/source');
    });
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'a', isDirectory: () => true },
      { name: 'b', isDirectory: () => true },
    ]);

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/source', destDir: '/dest' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when multiple workflow.json files are found', async () => {
    const { existsSync } = await import('fs');
    const { stat, readdir } = await import('fs/promises');

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      const str = String(p);
      return str.includes('/source') || str.includes('workflow.json');
    });
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'a', isDirectory: () => true },
      { name: 'b', isDirectory: () => true },
    ]);

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/source', destDir: '/dest' })
    ).rejects.toBeInstanceOf(CMError);
  });

  it('throws when workflow.json has invalid JSON', async () => {
    const { existsSync } = await import('fs');
    const { stat, readdir, readFile } = await import('fs/promises');

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return String(p).includes('/source') || String(p).includes('workflow.json');
    });
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'workflow', isDirectory: () => true },
    ]);
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('{bad');

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/source', destDir: '/dest' })
    ).rejects.toBeInstanceOf(SchemaError);
  });

  it('throws when workflow.json schema is invalid', async () => {
    const { existsSync } = await import('fs');
    const { stat, readdir, readFile } = await import('fs/promises');

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return String(p).includes('/source') || String(p).includes('workflow.json');
    });
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'workflow', isDirectory: () => true },
    ]);
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ name: 'Missing id' })
    );

    const { installWorkflowPack } = await loadModule();
    await expect(
      installWorkflowPack({ sourcePath: '/source', destDir: '/dest' })
    ).rejects.toBeInstanceOf(SchemaError);
  });

  it('installs workflows and overwrites when forced', async () => {
    const { existsSync } = await import('fs');
    const { stat, readdir, readFile, mkdir, rm, cp } = await import('fs/promises');

    (existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      return (
        String(p).includes('/source') ||
        String(p).includes('workflow.json') ||
        String(p).includes('/dest/demo')
      );
    });
    (stat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });
    (readdir as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'workflow', isDirectory: () => true },
    ]);
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ id: 'demo', name: 'Demo', steps: [] })
    );

    const { installWorkflowPack } = await loadModule();
    const result = await installWorkflowPack({
      sourcePath: '/source',
      destDir: '/dest',
      force: true,
    });

    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
    expect(rm).toHaveBeenCalledWith('/dest/demo', { recursive: true, force: true });
    expect(cp).toHaveBeenCalled();
    expect(result).toEqual({ id: 'demo', installPath: '/dest/demo' });
  });
});
