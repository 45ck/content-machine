import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';
import {
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
} from '../http';

interface OpenAISoraAdapterOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

function getField(obj: unknown, path: string[]): unknown {
  let current = obj as any;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function extractOutputUrl(payload: unknown): string | undefined {
  const candidates = [
    getField(payload, ['output', '0', 'url']),
    getField(payload, ['data', '0', 'url']),
    getField(payload, ['video', 'url']),
    getField(payload, ['result', 'url']),
  ];
  return candidates.find((v): v is string => typeof v === 'string' && v.length > 0);
}

function extractOutputBase64(payload: unknown): string | undefined {
  const candidates = [
    getField(payload, ['output', '0', 'b64_json']),
    getField(payload, ['data', '0', 'b64_json']),
    getField(payload, ['video', 'b64_json']),
    getField(payload, ['result', 'b64_json']),
  ];
  return candidates.find((v): v is string => typeof v === 'string' && v.length > 0);
}

function extractJobId(payload: unknown): string | undefined {
  const candidates = [getField(payload, ['id']), getField(payload, ['data', 'id'])];
  return candidates.find((v): v is string => typeof v === 'string' && v.length > 0);
}

function extractStatus(payload: unknown): string | undefined {
  const candidates = [getField(payload, ['status']), getField(payload, ['data', 'status'])];
  return candidates.find((v): v is string => typeof v === 'string' && v.length > 0);
}

/**
 * Experimental OpenAI Sora adapter.
 *
 * Notes:
 * - Uses the video endpoint contract configured for this deployment.
 * - Treated as opt-in; registry enables it only when `OPENAI_API_KEY` is set.
 */
export class OpenAISoraAdapter implements MediaSynthesisAdapter {
  readonly name = 'openai-sora';
  readonly capabilities = ['text-to-video', 'image-to-video'] as const;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(private readonly options: OpenAISoraAdapterOptions) {
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1/videos';
    this.model = options.model ?? 'sora-2';
    this.pollIntervalMs = options.pollIntervalMs ?? 4_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 120;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async toOutputPath(payload: unknown, outputPath: string): Promise<string> {
    const b64 = extractOutputBase64(payload);
    if (b64) return writeBase64ToPath({ base64: b64, outputPath });
    const url = extractOutputUrl(payload);
    if (url) return downloadToPath({ url, outputPath });
    throw new Error('Sora response did not include output video URL or base64 payload');
  }

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    const size = `${request.width}x${request.height}`;
    const common: Record<string, unknown> = {
      model: this.model,
      duration: request.durationSeconds,
      size,
    };
    const body: Record<string, unknown> =
      request.kind === 'text-to-video'
        ? { ...common, prompt: request.prompt }
        : {
            ...common,
            prompt: request.prompt ?? 'Animate this image with natural motion',
            image: await fileToDataUrl(request.inputImagePath),
          };

    const created = await fetchJsonWithTimeout({
      url: this.baseUrl,
      init: {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      },
      timeoutMs: 90_000,
    });

    const createdStatus = extractStatus(created);
    if (!createdStatus || createdStatus === 'succeeded' || createdStatus === 'completed') {
      return { outputPath: await this.toOutputPath(created, request.outputPath) };
    }

    const jobId = extractJobId(created);
    if (!jobId) {
      throw new Error('Sora video creation response did not include a job id');
    }

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await sleep(this.pollIntervalMs);
      const polled = await fetchJsonWithTimeout({
        url: `${this.baseUrl}/${jobId}`,
        init: {
          method: 'GET',
          headers: this.authHeaders(),
        },
        timeoutMs: 60_000,
      });
      const status = extractStatus(polled) ?? 'unknown';
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Sora job ${jobId} ended with status "${status}"`);
      }
      if (status === 'succeeded' || status === 'completed') {
        return { outputPath: await this.toOutputPath(polled, request.outputPath) };
      }
    }

    throw new Error(`Sora job did not complete within ${this.maxPollAttempts} poll attempts`);
  }
}
