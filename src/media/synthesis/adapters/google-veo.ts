import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';
import {
  downloadToPath,
  fetchJsonWithTimeout,
  fileToDataUrl,
  sleep,
  writeBase64ToPath,
} from '../http';
import { getGoogleAccessToken } from '../google-auth';

interface GoogleVeoAdapterOptions {
  apiKey?: string;
  endpoint?: string;
  vertexProject?: string;
  vertexLocation?: string;
  accessToken?: string;
  gcloudBinary?: string;
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
 * Supports either:
 * - legacy Gemini-key mode via `endpoint` + `apiKey`
 * - Vertex AI mode via `vertexProject` + access token / ADC / gcloud
 */
export class GoogleVeoAdapter implements MediaSynthesisAdapter {
  readonly name = 'google-veo';
  readonly capabilities = ['text-to-video', 'image-to-video'] as const;
  private readonly model: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;
  private readonly mode: 'legacy' | 'vertex';

  constructor(private readonly options: GoogleVeoAdapterOptions) {
    this.model = options.model ?? 'veo-3.1-generate-preview';
    this.pollIntervalMs = options.pollIntervalMs ?? 4_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 120;
    this.mode = options.endpoint ? 'legacy' : 'vertex';
  }

  private requestUrl(path = ''): string {
    const endpoint = this.options.endpoint;
    const apiKey = this.options.apiKey;
    if (!endpoint || !apiKey) {
      throw new Error('Legacy Veo mode requires apiKey and endpoint');
    }
    const base = endpoint.replace(/\/+$/, '');
    const suffix = path ? `/${path.replace(/^\/+/, '')}` : '';
    const connector = base.includes('?') ? '&' : '?';
    return `${base}${suffix}${connector}key=${encodeURIComponent(apiKey)}`;
  }

  private vertexBaseUrl(): string {
    const project = this.options.vertexProject ?? process.env.GOOGLE_CLOUD_PROJECT;
    const location =
      this.options.vertexLocation ?? process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';
    if (!project) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT is required for Vertex AI Veo requests. Set GOOGLE_CLOUD_PROJECT or use CM_MEDIA_VEO_ENDPOINT for legacy mode.'
      );
    }
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(
      project
    )}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(this.model)}`;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const accessToken =
      this.options.accessToken ??
      (await getGoogleAccessToken({ gcloudBinary: this.options.gcloudBinary }));
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  private aspectRatio(request: MediaSynthesisRequest): string {
    if (request.width === request.height) return '1:1';
    return request.width > request.height ? '16:9' : '9:16';
  }

  private resolution(request: MediaSynthesisRequest): '720p' | '1080p' {
    const largest = Math.max(request.width, request.height);
    return largest >= 1080 ? '1080p' : '720p';
  }

  private parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
    const mimeType = match?.[1];
    const base64 = match?.[2];
    if (!mimeType || !base64) {
      throw new Error('Expected image input as a data URL');
    }
    return { mimeType, base64 };
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
    if (request.kind !== 'image-to-video') {
      throw new Error(`Google Veo adapter does not support "${request.kind}" requests`);
    }
    return {
      ...base,
      prompt: request.prompt ?? 'Animate this image with cinematic motion',
      image: request.inputImagePath,
    };
  }

  private async buildVertexBody(request: MediaSynthesisRequest): Promise<Record<string, unknown>> {
    const instance: Record<string, unknown> = {
      prompt:
        request.kind === 'text-to-video'
          ? request.prompt
          : (request.prompt ?? 'Animate this image with cinematic motion'),
    };

    if (request.kind === 'image-to-video') {
      const dataUrl = await fileToDataUrl(request.inputImagePath);
      const image = this.parseDataUrl(dataUrl);
      instance.image = {
        bytesBase64Encoded: image.base64,
        mimeType: image.mimeType,
      };
    }

    return {
      instances: [instance],
      parameters: {
        aspectRatio: this.aspectRatio(request),
        durationSeconds: request.durationSeconds,
        generateAudio: true,
        personGeneration: 'dont_allow',
        resolution: this.resolution(request),
        resizeMode: request.kind === 'image-to-video' ? 'crop' : undefined,
        sampleCount: 1,
      },
    };
  }

  private async downloadGsUriToPath(params: {
    gcsUri: string;
    outputPath: string;
    headers: Record<string, string>;
  }): Promise<string> {
    const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(params.gcsUri);
    if (!match) throw new Error(`Unsupported gs:// URI: ${params.gcsUri}`);
    const bucket = match[1];
    const objectPath = match[2];
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
      bucket
    )}/o/${encodeURIComponent(objectPath)}?alt=media`;
    return downloadToPath({ url, outputPath: params.outputPath, headers: params.headers });
  }

  private async resolveOutput(params: { payload: unknown; outputPath: string }): Promise<string> {
    const url =
      readStringField(params.payload, ['outputUrl', 'videoUrl']) ??
      readStringField((params.payload as any)?.response, ['outputUrl', 'videoUrl']);
    if (url) return downloadToPath({ url, outputPath: params.outputPath });
    const b64 =
      readStringField(params.payload, ['outputBase64', 'videoBase64']) ??
      readStringField((params.payload as any)?.response, ['outputBase64', 'videoBase64']);
    if (b64) return writeBase64ToPath({ base64: b64, outputPath: params.outputPath });
    throw new Error('Veo response did not include output video data');
  }

  private async resolveVertexOutput(params: {
    payload: unknown;
    outputPath: string;
    headers: Record<string, string>;
  }): Promise<string> {
    const responsePayload = ((params.payload as any)?.response ?? params.payload) as any;
    const video = responsePayload?.videos?.[0];
    if (!video) throw new Error('Vertex Veo response did not include videos[0]');

    if (typeof video.bytesBase64Encoded === 'string' && video.bytesBase64Encoded.length > 0) {
      return writeBase64ToPath({
        base64: video.bytesBase64Encoded,
        outputPath: params.outputPath,
      });
    }

    if (typeof video.gcsUri === 'string' && video.gcsUri.length > 0) {
      return this.downloadGsUriToPath({
        gcsUri: video.gcsUri,
        outputPath: params.outputPath,
        headers: params.headers,
      });
    }

    throw new Error('Vertex Veo response did not include output video data');
  }

  private async submitLegacy(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    if (!this.options.apiKey || !this.options.endpoint) {
      throw new Error('Legacy Veo mode requires apiKey and endpoint');
    }
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
      const polled = (await fetchJsonWithTimeout({
        url: this.requestUrl(jobId),
        init: { method: 'GET' },
        timeoutMs: 60_000,
      })) as Record<string, unknown>;
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

  private async submitVertex(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    const headers = await this.authHeaders();
    const baseUrl = this.vertexBaseUrl();
    const body = await this.buildVertexBody(request);
    const created = (await fetchJsonWithTimeout({
      url: `${baseUrl}:predictLongRunning`,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      timeoutMs: 90_000,
    })) as Record<string, unknown>;

    const operationName = readStringField(created, ['name', 'operationName']);
    if (!operationName) throw new Error('Vertex Veo response did not include operation name');

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await sleep(this.pollIntervalMs);
      const polled = (await fetchJsonWithTimeout({
        url: `${baseUrl}:fetchPredictOperation`,
        init: {
          method: 'POST',
          headers,
          body: JSON.stringify({ operationName }),
        },
        timeoutMs: 60_000,
      })) as Record<string, unknown>;

      if ((polled as any)?.error?.message) {
        throw new Error(`Vertex Veo operation failed: ${(polled as any).error.message}`);
      }

      if ((polled as any)?.done === true) {
        return {
          outputPath: await this.resolveVertexOutput({
            payload: polled,
            outputPath: request.outputPath,
            headers: { Authorization: headers.Authorization },
          }),
        };
      }
    }

    throw new Error(
      `Vertex Veo operation did not complete within ${this.maxPollAttempts} poll attempts`
    );
  }

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    return this.mode === 'legacy' ? this.submitLegacy(request) : this.submitVertex(request);
  }
}
