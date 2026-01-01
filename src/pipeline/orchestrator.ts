/**
 * Pipeline Orchestrator
 *
 * Manages the state machine for content generation jobs.
 * Coordinates between deterministic steps and agent steps.
 */

import { v4 as uuid } from 'uuid';
import type { TrendItem, PipelineJob } from '../types/index.js';
import { TrendIngestStep } from '../steps/1a-trend-ingest.js';
import { PlannerStep } from '../steps/1b-planner.js';
import { ScriptGenerationStep } from '../steps/2-script-generation.js';
import { AssetCaptureStep } from '../steps/3-asset-capture.js';
import { VideoRenderStep } from '../steps/4-video-render.js';
import { reviewQueue } from '../steps/5-human-review.js';
import { ExportPackageStep } from '../steps/6-export-package.js';
import { AnalyticsStep } from '../steps/7-analytics.js';

export interface OrchestratorConfig {
  maxRetries: number;
  retryDelayMs: number;
  outputDir: string;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  outputDir: './output',
};

export class PipelineOrchestrator {
  private config: OrchestratorConfig;
  private jobs: Map<string, PipelineJob> = new Map();

  // Step instances
  private trendIngest = new TrendIngestStep();
  private planner = new PlannerStep();
  private scriptGen = new ScriptGenerationStep();
  private assetCapture = new AssetCaptureStep();
  private videoRender = new VideoRenderStep();
  private exportPackage = new ExportPackageStep();
  private analytics = new AnalyticsStep();

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run the daily pipeline from trend → review queue
   * Returns job in 'step-5-review' state, waiting for human approval
   */
  async runDailyPipeline(trendItem: TrendItem): Promise<PipelineJob> {
    const job: PipelineJob = {
      id: uuid(),
      status: 'pending',
      trendItemId: trendItem.id,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);

    try {
      // Step 1A: Already have trend item (passed in)
      await this.updateStatus(job, 'step-1a-ingest');
      console.log(`[Pipeline] Step 1A: Using trend "${trendItem.title}"`);

      // Step 1B: Plan content
      await this.updateStatus(job, 'step-1b-planning');
      const contentObject = await this.planner.execute(trendItem);
      job.contentObjectId = contentObject.id;

      // Step 2: Generate script
      await this.updateStatus(job, 'step-2-scripting');
      const script = await this.scriptGen.execute(contentObject);
      job.scriptId = script.id;

      // Step 3: Capture/gather assets
      await this.updateStatus(job, 'step-3-assets');
      const assets = await this.assetCapture.execute(script);

      // Step 4: Render video
      await this.updateStatus(job, 'step-4-rendering');
      const { sceneJson, previewPath } = await this.videoRender.execute(script, assets);
      job.sceneJsonId = sceneJson.id;

      // Step 5: Queue for human review
      await this.updateStatus(job, 'step-5-review');
      await reviewQueue.enqueue({
        pipelineJobId: job.id,
        contentObjectId: contentObject.id,
        trendTitle: trendItem.title,
        hook: contentObject.hook,
        script: { scenes: script.scenes },
        previewVideoPath: previewPath,
        priority: 'medium',
      });

      console.log(`[Pipeline] Job ${job.id} queued for review`);
      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updatedAt = new Date();
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  /**
   * Continue pipeline after human approval (Steps 6-7)
   */
  async continueAfterReview(jobId: string): Promise<PipelineJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== 'step-5-review') {
      throw new Error(`Job ${jobId} is not in review state`);
    }

    const reviewItem = await reviewQueue.getByJobId(jobId);
    if (!reviewItem || reviewItem.status !== 'approved') {
      throw new Error(`Job ${jobId} not approved`);
    }

    try {
      // Step 6: Export package
      await this.updateStatus(job, 'step-6-export');
      const exportPkg = await this.exportPackage.execute(
        job.sceneJsonId!,
        reviewItem.trendTitle,
        this.config.outputDir
      );
      job.exportPackageId = exportPkg.id;

      // Step 7: Analytics (will run after upload when metrics available)
      await this.updateStatus(job, 'step-7-analytics');
      // Analytics runs async after human uploads and metrics come in
      // For now, just mark complete

      await this.updateStatus(job, 'completed');
      console.log(`[Pipeline] Job ${job.id} completed`);

      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updatedAt = new Date();
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  getJob(id: string): PipelineJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): PipelineJob[] {
    return Array.from(this.jobs.values());
  }

  private async updateStatus(
    job: PipelineJob,
    status: PipelineJob['status']
  ): Promise<void> {
    job.status = status;
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);
    console.log(`[Pipeline] ${job.id} → ${status}`);
  }
}
