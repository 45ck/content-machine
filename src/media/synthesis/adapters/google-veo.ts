import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';
import { downloadToPath, fetchJsonWithTimeout, fileToDataUrl, sleep } from '../http';

interface GoogleVeoAdapterOptions {
  apiKey: string;
  /**
   * Gemini API base URL including version segment.
   *
   * Default: https://generativelanguage.googleapis.com/v1beta
   */
  baseUrl?: string;
  model?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  timeoutMs?: number;
}

function readStringField(payload: unknown, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = (payload as any)?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function readBooleanField(payload: unknown, key: string): boolean | undefined {
  const value = (payload as any)?.[key];
  if (typeof value === 'boolean') return value;
  return undefined;
}

function parseInlineData(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Expected data URL in base64 form (data:<mime>;base64,...)');
  }
  return { mimeType: match[1], data: match[2] };
}

function resolveAspectRatio(width: number, height: number): '9:16' | '16:9' {
  return height >= width ? '9:16' : '16:9';
}

function resolveResolution(width: number, height: number): '720p' | '1080p' {
  const maxDim = Math.max(width, height);
  return maxDim >= 1080 ? '1080p' : '720p';
}

function extractVideoUri(payload: unknown): string | undefined {
  const p: any = payload as any;
  return (
    p?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ??
    p?.response?.generatedVideos?.[0]?.video?.uri ??
    p?.response?.generatedVideos?.[0]?.videoUri ??
    p?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ??
    p?.videoUri ??
    p?.outputUrl ??
    p?.videoUrl
  );
}

/**
 * Experimental Google Veo adapter.
 *
 * Uses the Gemini REST API long-running operations:
 * - POST: {baseUrl}/models/{model}:predictLongRunning
 * - GET:  {baseUrl}/{operationName}
 *
 * Docs: https://ai.google.dev/gemini-api/docs/video
 */
export class GoogleVeoAdapter implements MediaSynthesisAdapter {
  readonly name = 'google-veo';
  readonly capabilities = ['text-to-video', 'image-to-video'] as const;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: GoogleVeoAdapterOptions) {
    this.model = options.model ?? 'veo-3.1-generate-preview';
    this.pollIntervalMs = options.pollIntervalMs ?? 4_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 120;
    this.baseUrl = (options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(
      /\/+$/,
      ''
    );
    this.timeoutMs = options.timeoutMs ?? 90_000;
  }

  private requestUrl(path: string): string {
    const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
    return `${this.baseUrl}${suffix}`;
  }

  private buildHeaders(contentType?: string): Record<string, string> {
    return {
      'x-goog-api-key': this.options.apiKey,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    };
  }

  private buildBody(request: MediaSynthesisRequest): Record<string, unknown> {
    const parameters: Record<string, unknown> = {
      aspectRatio: resolveAspectRatio(request.width, request.height),
      resolution: resolveResolution(request.width, request.height),
    };

    const duration = Math.round(request.durationSeconds);
    if (Number.isFinite(duration) && duration > 0) {
      parameters.durationSeconds = duration;
    }

    if (request.kind === 'text-to-video') {
      return {
        instances: [
          {
            prompt: request.prompt,
          },
        ],
        parameters,
      };
    }

    return {
      instances: [
        {
          prompt: request.prompt ?? 'Animate this image with cinematic motion',
          image: request.inputImagePath,
        },
      ],
      parameters,
    };
  }

  private async resolveOutput(params: { payload: unknown; outputPath: string }): Promise<string> {
    const uri = extractVideoUri(params.payload);
    if (!uri) {
      throw new Error('Veo operation response did not include a downloadable video URI');
    }
    return downloadToPath({
      url: uri,
      outputPath: params.outputPath,
      headers: this.buildHeaders(),
      timeoutMs: 120_000,
    });
  }

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    const body = this.buildBody(request);
    if (request.kind === 'image-to-video') {
      const instance = (body as any).instances?.[0];
      const dataUrl = await fileToDataUrl(request.inputImagePath);
      instance.image = { inlineData: parseInlineData(dataUrl) };
    }

    const created = (await fetchJsonWithTimeout({
      url: this.requestUrl(`/models/${encodeURIComponent(this.model)}:predictLongRunning`),
      init: {
        method: 'POST',
        headers: this.buildHeaders('application/json'),
        body: JSON.stringify(body),
      },
      timeoutMs: this.timeoutMs,
    })) as Record<string, unknown>;

    const doneNow = readBooleanField(created, 'done');
    const operationName = readStringField(created, ['name']);
    if (doneNow === true) {
      return {
        outputPath: await this.resolveOutput({ payload: created, outputPath: request.outputPath }),
      };
    }
    if (!operationName) throw new Error('Veo response did not include operation name');

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await sleep(this.pollIntervalMs);
      const polled = await fetchJsonWithTimeout({
        url: this.requestUrl(`/${operationName}`),
        init: { method: 'GET', headers: this.buildHeaders() },
        timeoutMs: 60_000,
      });
      const errorMessage = readStringField((polled as any)?.error, ['message']);
      if (errorMessage) throw new Error(`Veo operation failed: ${errorMessage}`);
      const done = readBooleanField(polled, 'done');
      if (!done) continue;
      return {
        outputPath: await this.resolveOutput({ payload: polled, outputPath: request.outputPath }),
      };
    }

    throw new Error(`Veo operation did not complete within ${this.maxPollAttempts} poll attempts`);
  }
}
