import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
} from '../../../../src/media/synthesis/http';

describe('media synthesis http helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts local file bytes into data URL with inferred mime', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-http-'));
    const imagePath = join(dir, 'frame.png');
    await writeFile(imagePath, Buffer.from([0xde, 0xad, 0xbe, 0xef]));

    const dataUrl = await fileToDataUrl(imagePath);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.endsWith('3q2+7w==')).toBe(true);
  });

  it('supports webp and jpeg mime inference', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-http-'));
    const webpPath = join(dir, 'frame.webp');
    const jpgPath = join(dir, 'frame.jpg');
    await writeFile(webpPath, Buffer.from([1]));
    await writeFile(jpgPath, Buffer.from([2]));

    const webpDataUrl = await fileToDataUrl(webpPath);
    const jpgDataUrl = await fileToDataUrl(jpgPath);
    expect(webpDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(jpgDataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('parses JSON responses and returns payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{"ok":true}',
      }))
    );

    const payload = (await fetchJsonWithTimeout({ url: 'https://example.com/api' })) as Record<
      string,
      unknown
    >;
    expect(payload.ok).toBe(true);
  });

  it('returns text payload when body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'plain-text',
      }))
    );

    const payload = await fetchJsonWithTimeout({ url: 'https://example.com/text' });
    expect(payload).toBe('plain-text');
  });

  it('throws detailed error on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '{"error":"rate_limited"}',
      }))
    );

    await expect(fetchJsonWithTimeout({ url: 'https://example.com/rate' })).rejects.toThrow(
      /HTTP 429 Too Many Requests/
    );
  });

  it('downloads binary content to output path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-http-'));
    const outputPath = join(dir, 'clip.mp4');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      }))
    );

    const written = await downloadToPath({
      url: 'https://example.com/clip.mp4',
      outputPath,
    });
    expect(written).toBe(outputPath);
    expect((await readFile(outputPath)).toString('hex')).toBe('01020304');
  });

  it('throws when binary download returns non-2xx status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      }))
    );

    await expect(
      downloadToPath({
        url: 'https://example.com/clip.mp4',
        outputPath: '/tmp/never-written.mp4',
      })
    ).rejects.toThrow(/Download failed: HTTP 502 Bad Gateway/);
  });

  it('writes base64 payload and strips data-url prefix', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-http-'));
    const outputPath = join(dir, 'clip.mp4');

    await writeBase64ToPath({
      base64: 'data:video/mp4;base64,AQID',
      outputPath,
    });

    expect((await readFile(outputPath)).toString('hex')).toBe('010203');
  });

  it('resolves sleep after requested delay', async () => {
    vi.useFakeTimers();
    const promise = sleep(25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
