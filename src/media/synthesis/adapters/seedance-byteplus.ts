import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';
import {
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
} from '../http';

interface SeedanceBytePlusAdapterOptions {
  apiKey: string;
  endpoint: string;
  model?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

function valueAt(payload: unknown, path: string[]): unknown {
  let current = payload as any;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function firstString(values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function extractStatus(payload: unknown): string | undefined {
  return firstString([
    valueAt(payload, ['status']),
    valueAt(payload, ['data', 'status']),
    valueAt(payload, ['task', 'status']),
  ]);
}

function extractJobId(payload: unknown): string | undefined {
  return firstString([
    valueAt(payload, ['id']),
    valueAt(payload, ['task_id']),
    valueAt(payload, ['data', 'id']),
    valueAt(payload, ['data', 'task_id']),
  ]);
}

function extractOutputUrl(payload: unknown): string | undefined {
  return firstString([
    valueAt(payload, ['output', '0', 'url']),
    valueAt(payload, ['video', 'url']),
    valueAt(payload, ['data', 'output_url']),
    valueAt(payload, ['data', 'video_url']),
  ]);
}

function extractOutputBase64(payload: unknown): string | undefined {
  return firstString([
    valueAt(payload, ['output', '0', 'b64_json']),
    valueAt(payload, ['video', 'b64_json']),
    valueAt(payload, ['data', 'output_b64']),
  ]);
}

/**
 * Experimental Seedance adapter for BytePlus-style async task APIs.
 *
 * The endpoint is deployment-configured to avoid hard-coding unstable vendor paths.
 */
export class SeedanceBytePlusAdapter implements MediaSynthesisAdapter {
  readonly name = 'seedance-byteplus';
  readonly capabilities = ['text-to-video', 'image-to-video'] as const;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(private readonly options: SeedanceBytePlusAdapterOptions) {
    this.model = options.model ?? 'seedance-1.5-pro';
    this.pollIntervalMs = options.pollIntervalMs ?? 4_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 120;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private buildBody(request: MediaSynthesisRequest): Record<string, unknown> {
    const common = {
      model: this.model,
      duration: request.durationSeconds,
      width: request.width,
      height: request.height,
    };
    if (request.kind === 'text-to-video') {
      return { ...common, prompt: request.prompt };
    }
    return {
      ...common,
      prompt: request.prompt ?? 'Animate this image with natural movement',
      image: request.inputImagePath,
    };
  }

  private async resolveOutput(payload: unknown, outputPath: string): Promise<string> {
    const base64 = extractOutputBase64(payload);
    if (base64) return writeBase64ToPath({ base64, outputPath });

    const url = extractOutputUrl(payload);
    if (url) return downloadToPath({ url, outputPath });

    throw new Error('Seedance response did not include output video');
  }

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    const body = this.buildBody(request);
    if (request.kind === 'image-to-video') {
      body.image = await fileToDataUrl(request.inputImagePath);
    }

    const createResponse = await fetchJsonWithTimeout({
      url: this.options.endpoint,
      init: {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      },
      timeoutMs: 90_000,
    });

    const initialStatus = extractStatus(createResponse);
    if (!initialStatus || initialStatus === 'succeeded' || initialStatus === 'completed') {
      return { outputPath: await this.resolveOutput(createResponse, request.outputPath) };
    }

    const jobId = extractJobId(createResponse);
    if (!jobId) {
      throw new Error('Seedance response did not include job id');
    }

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await sleep(this.pollIntervalMs);
      const statusResponse = await fetchJsonWithTimeout({
        url: `${this.options.endpoint.replace(/\/+$/, '')}/${jobId}`,
        init: {
          method: 'GET',
          headers: this.headers(),
        },
        timeoutMs: 60_000,
      });
      const status = extractStatus(statusResponse) ?? 'unknown';
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Seedance job ${jobId} ended with status "${status}"`);
      }
      if (status === 'succeeded' || status === 'completed') {
        return {
          outputPath: await this.resolveOutput(statusResponse, request.outputPath),
        };
      }
    }

    throw new Error(`Seedance job did not complete within ${this.maxPollAttempts} poll attempts`);
  }
}
