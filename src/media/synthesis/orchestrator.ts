import { randomUUID } from 'node:crypto';
import type {
  MediaSynthesisAdapter,
  MediaSynthesisJobRecord,
  MediaSynthesisRequest,
} from './types';

/**
 * In-memory orchestrator for synthesis jobs across multiple adapters.
 */
export class MediaSynthesisOrchestrator {
  private readonly adapters = new Map<string, MediaSynthesisAdapter>();
  private readonly jobs = new Map<string, MediaSynthesisJobRecord>();

  constructor(adapters: MediaSynthesisAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.name, adapter);
    }
  }

  getAdapter(name: string): MediaSynthesisAdapter | undefined {
    return this.adapters.get(name);
  }

  getJob(jobId: string): MediaSynthesisJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    return { ...job };
  }

  async runJob(params: {
    adapterName: string;
    request: MediaSynthesisRequest;
  }): Promise<MediaSynthesisJobRecord> {
    const { adapterName, request } = params;
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Unknown synthesis adapter: ${adapterName}`);
    }
    if (!adapter.capabilities.includes(request.kind)) {
      throw new Error(`Adapter "${adapterName}" does not support "${request.kind}" synthesis`);
    }

    const now = new Date().toISOString();
    const id = `msj_${randomUUID()}`;
    const queued: MediaSynthesisJobRecord = {
      id,
      adapter: adapterName,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      request,
    };
    this.jobs.set(id, queued);

    const running: MediaSynthesisJobRecord = {
      ...queued,
      status: 'running',
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, running);

    try {
      const result = await adapter.submit(request);
      const done: MediaSynthesisJobRecord = {
        ...running,
        status: 'succeeded',
        updatedAt: new Date().toISOString(),
        result,
      };
      this.jobs.set(id, done);
      return done;
    } catch (error) {
      const failed: MediaSynthesisJobRecord = {
        ...running,
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.jobs.set(id, failed);
      return failed;
    }
  }
}
