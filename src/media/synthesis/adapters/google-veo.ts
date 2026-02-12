import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';
import {
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
} from '../http';

interface GoogleVeoAdapterOptions {
  apiKey: string;
  endpoint: string;
  model?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

function readStringField(payload: unknown, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = (payload as any)?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Experimental Google Veo adapter.
 *
 * This implementation expects an explicit endpoint compatible with CM's
 * async job polling contract.
 */
export class GoogleVeoAdapter implements MediaSynthesisAdapter {
  readonly name = 'google-veo';
  readonly capabilities = ['text-to-video', 'image-to-video'] as const;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(private readonly options: GoogleVeoAdapterOptions) {
    this.model = options.model ?? 'veo-3.1';
    this.pollIntervalMs = options.pollIntervalMs ?? 4_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 120;
  }

  private requestUrl(path = ''): string {
    const base = this.options.endpoint.replace(/\/+$/, '');
    const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
    const connector = base.includes('?') ? '&' : '?';
    return `${base}${suffix}${connector}key=${encodeURIComponent(this.options.apiKey)}`;
  }

  private buildBody(request: MediaSynthesisRequest): Record<string, unknown> {
    const base = {
      model: this.model,
      durationSeconds: request.durationSeconds,
      width: request.width,
      height: request.height,
    };
    if (request.kind === 'text-to-video') {
      return { ...base, prompt: request.prompt };
    }
    return {
      ...base,
      prompt: request.prompt ?? 'Animate this image with cinematic motion',
      image: request.inputImagePath,
    };
  }

  private async resolveOutput(params: { payload: unknown; outputPath: string }): Promise<string> {
    const url = readStringField(params.payload, ['outputUrl', 'videoUrl']);
    if (url) return downloadToPath({ url, outputPath: params.outputPath });
    const b64 = readStringField(params.payload, ['outputBase64', 'videoBase64']);
    if (b64) return writeBase64ToPath({ base64: b64, outputPath: params.outputPath });
    throw new Error('Veo response did not include output video data');
  }

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    const body = this.buildBody(request);
    if (request.kind === 'image-to-video') {
      body.image = await fileToDataUrl(request.inputImagePath);
    }

    const created = (await fetchJsonWithTimeout({
      url: this.requestUrl(),
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs: 90_000,
    })) as Record<string, unknown>;

    const initialStatus = readStringField(created, ['status']);
    if (!initialStatus || initialStatus === 'succeeded' || initialStatus === 'completed') {
      return {
        outputPath: await this.resolveOutput({ payload: created, outputPath: request.outputPath }),
      };
    }

    const jobId = readStringField(created, ['jobId', 'id']);
    if (!jobId) throw new Error('Veo response did not include job id');

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await sleep(this.pollIntervalMs);
      const polled = await fetchJsonWithTimeout({
        url: this.requestUrl(jobId),
        init: { method: 'GET' },
        timeoutMs: 60_000,
      });
      const status = readStringField(polled, ['status']) ?? 'unknown';
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Veo job ${jobId} ended with status "${status}"`);
      }
      if (status === 'succeeded' || status === 'completed') {
        return {
          outputPath: await this.resolveOutput({ payload: polled, outputPath: request.outputPath }),
        };
      }
    }

    throw new Error(`Veo job did not complete within ${this.maxPollAttempts} poll attempts`);
  }
}
