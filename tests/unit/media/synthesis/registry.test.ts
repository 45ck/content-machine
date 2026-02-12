import { afterEach, describe, expect, it } from 'vitest';
import { createMediaSynthesisRegistry } from '../../../../src/media/synthesis/registry';

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe('createMediaSynthesisRegistry', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('always includes static-video adapter', () => {
    const adapters = createMediaSynthesisRegistry({ includeExperimentalCloudAdapters: false });
    expect(adapters.map((a) => a.name)).toContain('static-video');
    expect(adapters).toHaveLength(1);
  });

  it('adds cloud adapters only when required env is configured', () => {
    setEnv('OPENAI_API_KEY', 'test-openai');
    setEnv('GOOGLE_API_KEY', 'test-google');
    setEnv('CM_MEDIA_VEO_ENDPOINT', 'https://example.com/veo');
    setEnv('BYTEPLUS_API_KEY', 'test-byteplus');
    setEnv('CM_MEDIA_SEEDANCE_ENDPOINT', 'https://example.com/seedance');

    const adapters = createMediaSynthesisRegistry();
    expect(adapters.map((a) => a.name)).toEqual(
      expect.arrayContaining(['static-video', 'openai-sora', 'google-veo', 'seedance-byteplus'])
    );
  });
});
