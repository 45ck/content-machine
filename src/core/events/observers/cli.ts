/**
 * CLI Progress Observer
 *
 * Displays pipeline progress in terminal with ASCII-only output.
 * Uses stderr to keep stdout clean for artifacts.
 */

import type { PipelineEvent, PipelineObserver } from '../types.js';

export interface OutputStream {
  isTTY?: boolean;
  write(text: string): void;
}

export class CliProgressObserver implements PipelineObserver {
  private stream: OutputStream;
  private spinnerInterval?: ReturnType<typeof setInterval>;
  private spinnerFrames = ['|', '/', '-', '\\'];
  private spinnerIndex = 0;
  private lastNonTtyBucket: number | null = null;
  private lastNonTtyPhase: string | undefined;

  constructor(stream?: OutputStream) {
    this.stream = stream ?? process.stderr;
  }

  onEvent(event: PipelineEvent): void {
    switch (event.type) {
      case 'pipeline:started':
        this.onPipelineStarted(event);
        break;
      case 'pipeline:completed':
        this.onPipelineCompleted(event);
        break;
      case 'pipeline:failed':
        this.onPipelineFailed(event);
        break;
      case 'stage:started':
        this.onStageStarted(event);
        break;
      case 'stage:completed':
        this.onStageCompleted(event);
        break;
      case 'stage:failed':
        this.onStageFailed(event);
        break;
      case 'stage:progress':
        this.onStageProgress(event);
        break;
    }
  }

  /**
   * Clean up spinner interval
   */
  dispose(): void {
    this.stopSpinner();
  }

  private onPipelineStarted(event: PipelineEvent & { type: 'pipeline:started' }): void {
    this.writeLine(`[*] Starting pipeline: ${event.topic} (${event.archetype})`);
  }

  private onPipelineCompleted(event: PipelineEvent & { type: 'pipeline:completed' }): void {
    this.stopSpinner();
    const seconds = (event.durationMs / 1000).toFixed(1);
    this.writeLine(`[+] Pipeline completed in ${seconds}s`);
    if (event.outputPath) {
      this.writeLine(`    Output: ${event.outputPath}`);
    }
  }

  private onPipelineFailed(event: PipelineEvent & { type: 'pipeline:failed' }): void {
    this.stopSpinner();
    this.writeLine(`[!] Pipeline failed: ${event.error.message}`);
  }

  private onStageStarted(event: PipelineEvent & { type: 'stage:started' }): void {
    const progress = `[${event.stageIndex + 1}/${event.totalStages}]`;
    this.writeLine(`${progress} Starting ${event.stage}...`);
    this.lastNonTtyBucket = null;
    this.lastNonTtyPhase = undefined;
    if (this.stream.isTTY) {
      this.startSpinner();
    }
  }

  private onStageCompleted(event: PipelineEvent & { type: 'stage:completed' }): void {
    this.stopSpinner();
    const progress = `[${event.stageIndex + 1}/${event.totalStages}]`;
    const seconds = (event.durationMs / 1000).toFixed(1);
    this.writeLine(`${progress} ${event.stage} completed (${seconds}s)`);
  }

  private onStageFailed(event: PipelineEvent & { type: 'stage:failed' }): void {
    this.stopSpinner();
    const progress = `[${event.stageIndex + 1}/${event.totalStages}]`;
    this.writeLine(`${progress} ${event.stage} failed: ${event.error.message}`);
  }

  private onStageProgress(event: PipelineEvent & { type: 'stage:progress' }): void {
    const percent = Math.round(event.progress * 100);
    const progress = `[${event.stageIndex + 1}/${event.totalStages}]`;
    const details: string[] = [];
    if (event.phase) details.push(event.phase);
    if (event.message) details.push(event.message);
    const message = details.length > 0 ? ` ${details.join(' - ')}` : '';

    if (this.stream.isTTY) {
      // Prefer deterministic progress over spinner frames.
      this.stopSpinner();
      // Overwrite line in TTY mode
      this.stream.write(`\r${progress} ${event.stage}: ${percent}%${message}    `);
    } else {
      const bucket = Math.floor(percent / 10) * 10;
      const phase = event.phase;

      // Print coarse updates only (avoid log spam), but always print 100%.
      if (percent === 100 || this.lastNonTtyBucket === null) {
        this.lastNonTtyBucket = bucket;
        this.lastNonTtyPhase = phase;
        this.writeLine(`${progress} ${event.stage}: ${percent}%${message}`);
        return;
      }

      if (bucket !== this.lastNonTtyBucket || phase !== this.lastNonTtyPhase) {
        this.lastNonTtyBucket = bucket;
        this.lastNonTtyPhase = phase;
        this.writeLine(`${progress} ${event.stage}: ${percent}%${message}`);
      }
    }
  }

  private writeLine(text: string): void {
    this.stream.write(text + '\n');
  }

  private startSpinner(): void {
    if (this.spinnerInterval) return;
    this.spinnerInterval = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
      this.stream.write(`\r  ${this.spinnerFrames[this.spinnerIndex]} `);
    }, 100);
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
      if (this.stream.isTTY) {
        this.stream.write('\r    \r'); // Clear spinner
      }
    }
  }
}
