import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/render/templates/registry', () => ({
  listVideoTemplates: vi.fn(),
}));

vi.mock('../../../../src/render/templates', () => ({
  resolveVideoTemplate: vi.fn(),
  importRemotionTemplate: vi.fn(),
}));

vi.mock('../../../../src/render/templates/installer', () => ({
  installTemplatePack: vi.fn(),
}));

vi.mock('../../../../src/render/templates/dev', () => ({
  scaffoldVideoTemplate: vi.fn(),
  packVideoTemplate: vi.fn(),
  previewVideoTemplate: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stdout,
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli templates command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('lists templates in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { listVideoTemplates } = await import('../../../../src/render/templates/registry');
    (listVideoTemplates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'base', name: 'Base', source: 'builtin' },
    ]);

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['list'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('templates:list');
    expect(payload.outputs.templates.length).toBe(1);
  });

  it('prints no templates message in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { listVideoTemplates } = await import('../../../../src/render/templates/registry');
    (listVideoTemplates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['list'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('No templates found.');
  });

  it('shows template in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { resolveVideoTemplate } = await import('../../../../src/render/templates');
    (resolveVideoTemplate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      template: { id: 'base' },
      source: 'builtin',
      templatePath: '/tmp/template.json',
    });

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['show', 'base'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Template: base');
  });

  it('installs template packs in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { installTemplatePack } = await import('../../../../src/render/templates/installer');
    (installTemplatePack as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'base',
      installPath: '/tmp/base',
    });

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['install', '/tmp/base.zip'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Installed template');
  });

  it('scaffolds a template in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { scaffoldVideoTemplate } = await import('../../../../src/render/templates/dev');
    (scaffoldVideoTemplate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acme-demo',
      templateDir: '/tmp/acme-demo',
      templatePath: '/tmp/acme-demo/template.json',
    });

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['new', 'acme-demo'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('templates:new');
    expect(payload.outputs.templateId).toBe('acme-demo');
  });

  it('packs a template dir in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { packVideoTemplate } = await import('../../../../src/render/templates/dev');
    (packVideoTemplate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acme-demo',
      outputPath: '/tmp/acme-demo.zip',
    });

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(['pack', '/tmp/acme-demo'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('templates:pack');
    expect(payload.outputs.templateId).toBe('acme-demo');
  });

  it('imports a Remotion project in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { importRemotionTemplate } = await import('../../../../src/render/templates');
    (importRemotionTemplate as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'tiktok',
      templateDir: '/tmp/tiktok',
      templatePath: '/tmp/tiktok/template.json',
      importedFrom: {
        source: 'https://www.remotion.dev/templates/tiktok',
        resolvedSource: 'github:example/myrepo#main',
      },
    });

    const { templatesCommand } = await import('../../../../src/cli/commands/templates');
    await templatesCommand.parseAsync(
      ['import', 'https://www.remotion.dev/templates/tiktok', '--id', 'tiktok'],
      { from: 'user' }
    );

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('templates:import');
    expect(payload.outputs.templateId).toBe('tiktok');
  });
});
