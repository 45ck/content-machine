# Implementation Phase 5: cm generate — Integration & Polish

**Phase:** 5  
**Duration:** Weeks 8-10  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-5-INTEGRATION-20260105  
**Prerequisites:** Phases 0-4 complete (all commands working)

---

## 1. Overview

Phase 5 integrates all pipeline stages into the unified `cm generate` command and polishes the CLI experience. This phase transforms four separate commands into a seamless one-command solution.

### 1.1 Goals

- ✅ `cm generate "topic"` runs full pipeline → video.mp4
- ✅ `cm init` interactive setup wizard
- ✅ Progress reporting and logging
- ✅ Error recovery and graceful degradation
- ✅ Configuration validation
- ✅ Documentation and examples

### 1.2 Non-Goals

- ❌ Web dashboard — Post-MVP
- ❌ Batch processing — Post-MVP
- ❌ Auto-upload to platforms — Post-MVP

---

## 2. Deliverables

### 2.1 File Structure

```
src/
├── cli/
│   ├── index.ts              # Main entry (enhanced)
│   └── commands/
│       ├── generate.ts       # Full pipeline command
│       ├── init.ts           # Setup wizard
│       └── version.ts        # Version info
├── core/
│   ├── pipeline.ts           # Pipeline orchestration
│   ├── progress.ts           # Progress reporting
│   └── recovery.ts           # Error recovery
└── __tests__/
    └── e2e/
        ├── generate.test.ts
        └── init.test.ts

# Root files
.content-machine.toml.example
README.md (enhanced)
```

### 2.2 Component Matrix

| Component | File                           | Interface          | Test Coverage |
| --------- | ------------------------------ | ------------------ | ------------- |
| Pipeline  | `src/core/pipeline.ts`         | `Pipeline`         | 90%           |
| Progress  | `src/core/progress.ts`         | `ProgressReporter` | 85%           |
| Recovery  | `src/core/recovery.ts`         | `RecoveryManager`  | 90%           |
| Generate  | `src/cli/commands/generate.ts` | `cm generate`      | E2E           |
| Init      | `src/cli/commands/init.ts`     | `cm init`          | 80%           |

---

## 3. Implementation Details

### 3.1 Pipeline Orchestration

**Pattern from:** [RQ-01-PIPELINE-ARCHITECTURE-20260104.md](../research/investigations/RQ-01-PIPELINE-ARCHITECTURE-20260104.md)

```typescript
// src/core/pipeline.ts
import { EventEmitter } from 'events';
import { generateScript, GenerateScriptResult } from '../script/generator';
import { AudioPipeline, AudioPipelineResult } from '../audio/pipeline';
import { VisualMatcher, VisualsOutput } from '../visuals/matcher';
import { RenderService, RenderResult } from '../render/service';
import { loadConfig, Config } from './config';
import { logger } from './logger';

export type PipelineStage = 'script' | 'audio' | 'visuals' | 'render';

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
}

export interface PipelineOptions {
  topic: string;
  archetype: string;
  outputPath: string;
  voice?: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  workDir?: string;
  keepArtifacts?: boolean;
}

export interface PipelineResult {
  outputPath: string;
  duration: number;
  fileSize: number;
  stages: {
    script: GenerateScriptResult;
    audio: AudioPipelineResult;
    visuals: VisualsOutput;
    render: RenderResult;
  };
  totalTime: number;
}

export class Pipeline extends EventEmitter {
  private config: Config;

  constructor(config?: Config) {
    super();
    this.config = config ?? loadConfig();
  }

  static create(): Pipeline {
    return new Pipeline();
  }

  async run(options: PipelineOptions): Promise<PipelineResult> {
    const startTime = Date.now();
    const workDir = options.workDir ?? '.cm-work';

    // Ensure work directory
    await this.ensureWorkDir(workDir);

    logger.info({ topic: options.topic, archetype: options.archetype }, 'Starting pipeline');

    try {
      // Stage 1: Script
      this.emit('progress', { stage: 'script', progress: 0, message: 'Generating script...' });
      const scriptResult = await this.runScriptStage(options);
      this.emit('progress', { stage: 'script', progress: 100, message: 'Script complete' });

      // Stage 2: Audio
      this.emit('progress', { stage: 'audio', progress: 0, message: 'Generating audio...' });
      const audioResult = await this.runAudioStage(scriptResult.script, options, workDir);
      this.emit('progress', { stage: 'audio', progress: 100, message: 'Audio complete' });

      // Stage 3: Visuals
      this.emit('progress', { stage: 'visuals', progress: 0, message: 'Matching visuals...' });
      const visualsResult = await this.runVisualsStage(
        scriptResult.script,
        audioResult.audio,
        options
      );
      this.emit('progress', { stage: 'visuals', progress: 100, message: 'Visuals complete' });

      // Stage 4: Render
      this.emit('progress', { stage: 'render', progress: 0, message: 'Rendering video...' });
      const renderResult = await this.runRenderStage(
        scriptResult.script,
        audioResult,
        visualsResult,
        options,
        workDir
      );
      this.emit('progress', { stage: 'render', progress: 100, message: 'Render complete' });

      // Cleanup if not keeping artifacts
      if (!options.keepArtifacts) {
        await this.cleanup(workDir);
      }

      const totalTime = (Date.now() - startTime) / 1000;

      logger.info(
        {
          output: renderResult.outputPath,
          duration: renderResult.duration,
          totalTime,
        },
        'Pipeline complete'
      );

      return {
        outputPath: renderResult.outputPath,
        duration: renderResult.duration,
        fileSize: renderResult.fileSize,
        stages: {
          script: scriptResult,
          audio: audioResult,
          visuals: visualsResult,
          render: renderResult,
        },
        totalTime,
      };
    } catch (error) {
      this.emit('error', { stage: this.getCurrentStage(), error });
      throw error;
    }
  }

  private async runScriptStage(options: PipelineOptions): Promise<GenerateScriptResult> {
    const llm = createLLMProvider(this.config.llm);
    return generateScript(llm, {
      topic: options.topic,
      archetype: options.archetype,
    });
  }

  private async runAudioStage(
    script: ScriptOutput,
    options: PipelineOptions,
    workDir: string
  ): Promise<AudioPipelineResult> {
    const pipeline = AudioPipeline.create(this.config.audio);
    return pipeline.process(script, {
      voice: options.voice,
      outputDir: workDir,
    });
  }

  private async runVisualsStage(
    script: ScriptOutput,
    audio: AudioOutput,
    options: PipelineOptions
  ): Promise<VisualsOutput> {
    const matcher = VisualMatcher.create(this.config.visuals);
    return matcher.match(script, audio, {
      orientation: options.orientation,
    });
  }

  private async runRenderStage(
    script: ScriptOutput,
    audio: AudioPipelineResult,
    visuals: VisualsOutput,
    options: PipelineOptions,
    workDir: string
  ): Promise<RenderResult> {
    const service = new RenderService();

    // Save artifacts
    const scriptPath = join(workDir, 'script.json');
    const timestampsPath = audio.timestampsPath;
    const visualsPath = join(workDir, 'visuals.json');

    writeFileSync(scriptPath, JSON.stringify(script, null, 2));
    writeFileSync(visualsPath, JSON.stringify(visuals, null, 2));

    return service.render(
      {
        scriptPath,
        timestampsPath,
        visualsPath,
        audioPath: audio.audioPath,
      },
      {
        outputPath: options.outputPath,
      }
    );
  }

  private async ensureWorkDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private async cleanup(dir: string): Promise<void> {
    // Remove work directory
    await rm(dir, { recursive: true, force: true });
  }

  private getCurrentStage(): PipelineStage {
    // Track internally
    return 'script';
  }
}
```

### 3.2 Progress Reporter

```typescript
// src/core/progress.ts
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { PipelineProgress, PipelineStage } from './pipeline';

const stageIcons: Record<PipelineStage, string> = {
  script: '📝',
  audio: '🎙️',
  visuals: '🎬',
  render: '🎥',
};

const stageNames: Record<PipelineStage, string> = {
  script: 'Script',
  audio: 'Audio',
  visuals: 'Visuals',
  render: 'Render',
};

export class ProgressReporter {
  private spinner: Ora;
  private startTime: number;
  private stageStartTime: number;

  constructor() {
    this.spinner = ora();
    this.startTime = Date.now();
    this.stageStartTime = Date.now();
  }

  start(message: string): void {
    this.startTime = Date.now();
    this.spinner.start(message);
  }

  onProgress(progress: PipelineProgress): void {
    const icon = stageIcons[progress.stage];
    const name = stageNames[progress.stage];

    if (progress.progress === 0) {
      this.stageStartTime = Date.now();
      this.spinner.text = `${icon} ${name}: ${progress.message}`;
    } else if (progress.progress === 100) {
      const elapsed = ((Date.now() - this.stageStartTime) / 1000).toFixed(1);
      this.spinner.succeed(`${icon} ${name}: Done (${elapsed}s)`);
      this.spinner.start('Processing...');
    } else {
      this.spinner.text = `${icon} ${name}: ${progress.message} (${progress.progress}%)`;
    }
  }

  onError(stage: PipelineStage, error: Error): void {
    this.spinner.fail(`${stageIcons[stage]} ${stageNames[stage]}: Failed`);
    console.error(chalk.red(error.message));
  }

  complete(outputPath: string, duration: number, fileSize: number): void {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.spinner.succeed(chalk.green('Pipeline complete!'));

    console.log('');
    console.log(chalk.bold('Output:'), outputPath);
    console.log(chalk.bold('Duration:'), `${duration.toFixed(1)}s`);
    console.log(chalk.bold('Size:'), `${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(chalk.bold('Total time:'), `${totalTime}s`);
  }
}
```

### 3.3 Error Recovery

**Pattern from:** [RQ-14-ERROR-HANDLING-20260104.md](../research/investigations/RQ-14-ERROR-HANDLING-20260104.md)

```typescript
// src/core/recovery.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PipelineStage } from './pipeline';
import { logger } from './logger';

interface Checkpoint {
  stage: PipelineStage;
  timestamp: string;
  options: any;
  artifacts: Record<string, string>;
}

export class RecoveryManager {
  private checkpointPath: string;

  constructor(workDir: string) {
    this.checkpointPath = join(workDir, '.checkpoint.json');
  }

  async saveCheckpoint(
    stage: PipelineStage,
    options: any,
    artifacts: Record<string, string>
  ): Promise<void> {
    const checkpoint: Checkpoint = {
      stage,
      timestamp: new Date().toISOString(),
      options,
      artifacts,
    };

    writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2));
    logger.debug({ stage }, 'Checkpoint saved');
  }

  async loadCheckpoint(): Promise<Checkpoint | null> {
    if (!existsSync(this.checkpointPath)) {
      return null;
    }

    try {
      const data = readFileSync(this.checkpointPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async clearCheckpoint(): Promise<void> {
    if (existsSync(this.checkpointPath)) {
      await rm(this.checkpointPath);
    }
  }

  canResume(checkpoint: Checkpoint): boolean {
    // Validate all artifacts still exist
    for (const path of Object.values(checkpoint.artifacts)) {
      if (!existsSync(path)) {
        return false;
      }
    }
    return true;
  }

  getResumeStage(completedStage: PipelineStage): PipelineStage | null {
    const order: PipelineStage[] = ['script', 'audio', 'visuals', 'render'];
    const index = order.indexOf(completedStage);

    if (index < order.length - 1) {
      return order[index + 1];
    }
    return null;
  }
}
```

### 3.4 Generate Command

```typescript
// src/cli/commands/generate.ts
import { Command } from 'commander';
import { resolve } from 'path';
import { Pipeline, PipelineProgress } from '../../core/pipeline';
import { ProgressReporter } from '../../core/progress';
import { RecoveryManager } from '../../core/recovery';
import { loadConfig, validateConfig } from '../../core/config';
import { listArchetypes } from '../../script/archetypes';
import { logger } from '../../core/logger';

export function createGenerateCommand(): Command {
  return new Command('generate')
    .description('Generate a video from a topic (full pipeline)')
    .argument('<topic>', 'The topic for the video')
    .option('-a, --archetype <type>', 'Content archetype', 'listicle')
    .option('-o, --output <path>', 'Output video path', 'output.mp4')
    .option('--voice <name>', 'TTS voice', 'af_heart')
    .option('--orientation <type>', 'Video orientation', 'portrait')
    .option('--work-dir <path>', 'Working directory for artifacts', '.cm-work')
    .option('--keep-artifacts', 'Keep intermediate files')
    .option('--resume', 'Resume from last checkpoint')
    .option('--list-archetypes', 'List available archetypes')
    .action(async (topic, options) => {
      // Handle list archetypes
      if (options.listArchetypes) {
        console.log('Available archetypes:');
        listArchetypes().forEach((a) => console.log(`  - ${a}`));
        return;
      }

      // Validate configuration
      try {
        const config = loadConfig();
        validateConfig(config);
      } catch (error) {
        console.error('Configuration error:', error instanceof Error ? error.message : error);
        console.log('Run "cm init" to set up your configuration.');
        process.exit(1);
      }

      const reporter = new ProgressReporter();
      const recovery = new RecoveryManager(options.workDir);

      // Check for resume
      if (options.resume) {
        const checkpoint = await recovery.loadCheckpoint();
        if (checkpoint && recovery.canResume(checkpoint)) {
          console.log(`Resuming from ${checkpoint.stage} stage...`);
          // Resume logic would go here
        } else {
          console.log('No valid checkpoint found, starting fresh.');
        }
      }

      reporter.start(`Generating video: "${topic}"`);

      try {
        const pipeline = Pipeline.create();

        // Wire up progress
        pipeline.on('progress', (progress: PipelineProgress) => {
          reporter.onProgress(progress);
        });

        pipeline.on('error', ({ stage, error }) => {
          reporter.onError(stage, error);
        });

        // Run pipeline
        const result = await pipeline.run({
          topic,
          archetype: options.archetype,
          outputPath: resolve(options.output),
          voice: options.voice,
          orientation: options.orientation,
          workDir: options.workDir,
          keepArtifacts: options.keepArtifacts,
        });

        reporter.complete(result.outputPath, result.duration, result.fileSize);

        // Clear checkpoint on success
        await recovery.clearCheckpoint();
      } catch (error) {
        console.error('\nPipeline failed:', error instanceof Error ? error.message : error);
        console.log('\nTo resume from the last successful stage, run:');
        console.log(`  cm generate "${topic}" --resume`);
        process.exit(1);
      }
    });
}
```

### 3.5 Init Command (Setup Wizard)

```typescript
// src/cli/commands/init.ts
import { Command } from 'commander';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Interactive setup wizard')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      const configPath = resolve('.content-machine.toml');

      if (existsSync(configPath) && !options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Configuration already exists. Overwrite?',
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log('Aborted.');
          return;
        }
      }

      console.log(chalk.bold('\n🎬 Content Machine Setup\n'));

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'llmProvider',
          message: 'LLM Provider:',
          choices: ['openai', 'anthropic'],
          default: 'openai',
        },
        {
          type: 'input',
          name: 'llmModel',
          message: 'LLM Model:',
          default: (a: any) =>
            a.llmProvider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
        },
        {
          type: 'list',
          name: 'defaultArchetype',
          message: 'Default content archetype:',
          choices: ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'],
          default: 'listicle',
        },
        {
          type: 'list',
          name: 'voice',
          message: 'Default TTS voice:',
          choices: [
            { name: 'American Female (af_heart)', value: 'af_heart' },
            { name: 'American Male (am_adam)', value: 'am_adam' },
            { name: 'British Female (bf_emma)', value: 'bf_emma' },
            { name: 'British Male (bm_george)', value: 'bm_george' },
          ],
          default: 'af_heart',
        },
        {
          type: 'list',
          name: 'orientation',
          message: 'Default video orientation:',
          choices: ['portrait', 'landscape', 'square'],
          default: 'portrait',
        },
      ]);

      // Generate TOML config
      const config = `# Content Machine Configuration
# Generated by: cm init

[defaults]
archetype = "${answers.defaultArchetype}"
orientation = "${answers.orientation}"
voice = "${answers.voice}"

[llm]
provider = "${answers.llmProvider}"
model = "${answers.llmModel}"
temperature = 0.7

[audio]
tts_engine = "kokoro"
asr_engine = "whisper"
asr_model = "base"

[visuals]
provider = "pexels"
cache_enabled = true
cache_ttl = 3600

[render]
width = 1080
height = 1920
fps = 30
codec = "h264"
crf = 23
`;

      writeFileSync(configPath, config);
      console.log(chalk.green(`\n✅ Configuration saved to ${configPath}`));

      // Check for API keys
      console.log(chalk.bold('\n📋 API Keys Required:\n'));

      const requiredKeys = [
        { key: 'OPENAI_API_KEY', name: 'OpenAI', needed: answers.llmProvider === 'openai' },
        {
          key: 'ANTHROPIC_API_KEY',
          name: 'Anthropic',
          needed: answers.llmProvider === 'anthropic',
        },
        { key: 'PEXELS_API_KEY', name: 'Pexels', needed: true },
      ];

      for (const { key, name, needed } of requiredKeys) {
        if (needed) {
          const hasKey = process.env[key];
          const status = hasKey ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${status} ${key} (${name})`);
        }
      }

      console.log('\nSet API keys in your .env file or environment variables.');
      console.log('\nExample .env file:');
      console.log(chalk.gray('  OPENAI_API_KEY=sk-...'));
      console.log(chalk.gray('  PEXELS_API_KEY=...'));

      console.log(chalk.bold('\n🚀 Ready to generate videos!'));
      console.log(`\nTry: ${chalk.cyan('cm generate "5 JavaScript tips"')}`);
    });
}
```

### 3.6 Main CLI Entry

```typescript
// src/cli/index.ts
import { Command } from 'commander';
import { createScriptCommand } from './commands/script';
import { createAudioCommand } from './commands/audio';
import { createVisualsCommand } from './commands/visuals';
import { createRenderCommand } from './commands/render';
import { createGenerateCommand } from './commands/generate';
import { createInitCommand } from './commands/init';
import { version } from '../../package.json';

const program = new Command();

program.name('cm').description('CLI-first automated short-form video generator').version(version);

// Pipeline stages
program.addCommand(createGenerateCommand());
program.addCommand(createScriptCommand());
program.addCommand(createAudioCommand());
program.addCommand(createVisualsCommand());
program.addCommand(createRenderCommand());

// Setup
program.addCommand(createInitCommand());

// Parse and run
program.parse();
```

---

## 4. Tests to Write First (TDD)

### 4.1 E2E Pipeline Test

```typescript
// src/__tests__/e2e/generate.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('cm generate (E2E)', () => {
  const testDir = join(__dirname, 'test-output');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should generate video from topic', () => {
    const outputPath = join(testDir, 'video.mp4');

    execSync(
      `cm generate "3 TypeScript tips" --archetype listicle --output ${outputPath} --work-dir ${testDir}`,
      { timeout: 300000 } // 5 minutes
    );

    expect(existsSync(outputPath)).toBe(true);

    // Verify file is valid MP4
    const stats = require('fs').statSync(outputPath);
    expect(stats.size).toBeGreaterThan(1000000); // > 1MB
  }, 300000);

  it('should keep artifacts when requested', () => {
    const outputPath = join(testDir, 'video.mp4');

    execSync(
      `cm generate "test topic" --output ${outputPath} --work-dir ${testDir} --keep-artifacts`,
      { timeout: 300000 }
    );

    expect(existsSync(join(testDir, 'script.json'))).toBe(true);
    expect(existsSync(join(testDir, 'timestamps.json'))).toBe(true);
    expect(existsSync(join(testDir, 'visuals.json'))).toBe(true);
  }, 300000);
});
```

### 4.2 Pipeline Unit Tests

```typescript
// src/core/__tests__/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pipeline, PipelineProgress } from '../pipeline';

// Mock all services
vi.mock('../../script/generator');
vi.mock('../../audio/pipeline');
vi.mock('../../visuals/matcher');
vi.mock('../../render/service');

describe('Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit progress events for each stage', async () => {
    const pipeline = Pipeline.create();
    const progressEvents: PipelineProgress[] = [];

    pipeline.on('progress', (p) => progressEvents.push(p));

    await pipeline.run({
      topic: 'test',
      archetype: 'listicle',
      outputPath: 'out.mp4',
    });

    const stages = [...new Set(progressEvents.map((p) => p.stage))];
    expect(stages).toContain('script');
    expect(stages).toContain('audio');
    expect(stages).toContain('visuals');
    expect(stages).toContain('render');
  });

  it('should emit error on failure', async () => {
    const pipeline = Pipeline.create();
    const errors: any[] = [];

    // Mock script to fail
    vi.mocked(generateScript).mockRejectedValue(new Error('LLM failed'));

    pipeline.on('error', (e) => errors.push(e));

    await expect(
      pipeline.run({
        topic: 'test',
        archetype: 'listicle',
        outputPath: 'out.mp4',
      })
    ).rejects.toThrow('LLM failed');

    expect(errors).toHaveLength(1);
    expect(errors[0].stage).toBe('script');
  });
});
```

### 4.3 Recovery Tests

```typescript
// src/core/__tests__/recovery.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecoveryManager } from '../recovery';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('RecoveryManager', () => {
  const testDir = join(__dirname, 'test-recovery');
  let recovery: RecoveryManager;

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    recovery = new RecoveryManager(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should save and load checkpoint', async () => {
    await recovery.saveCheckpoint(
      'audio',
      { topic: 'test' },
      {
        script: join(testDir, 'script.json'),
      }
    );

    // Create the artifact
    writeFileSync(join(testDir, 'script.json'), '{}');

    const checkpoint = await recovery.loadCheckpoint();

    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.stage).toBe('audio');
  });

  it('should detect missing artifacts', async () => {
    await recovery.saveCheckpoint(
      'audio',
      {},
      {
        script: join(testDir, 'missing.json'),
      }
    );

    const checkpoint = await recovery.loadCheckpoint();
    expect(recovery.canResume(checkpoint!)).toBe(false);
  });

  it('should get next resume stage', () => {
    expect(recovery.getResumeStage('script')).toBe('audio');
    expect(recovery.getResumeStage('audio')).toBe('visuals');
    expect(recovery.getResumeStage('render')).toBeNull();
  });
});
```

---

## 5. Validation Checklist

### 5.1 Layer 1: Schema Validation

- [ ] Pipeline options validated
- [ ] Config validated on startup
- [ ] All stage outputs validated

### 5.2 Layer 2: Programmatic Checks

- [ ] All 4 stages execute in order
- [ ] Progress events fire correctly
- [ ] Checkpoints save/load correctly
- [ ] Cleanup removes work directory

### 5.3 Layer 3: Integration

- [ ] `cm generate` completes in < 5 minutes
- [ ] `cm init` creates valid config
- [ ] Error recovery works
- [ ] Resume from checkpoint works

### 5.4 Layer 4: Manual Review

- [ ] CLI output is clear and helpful
- [ ] Error messages are actionable
- [ ] Progress feedback is accurate
- [ ] Generated videos are usable

---

## 6. Research References

| Topic                 | Document                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Pipeline architecture | [RQ-01-PIPELINE-ARCHITECTURE-20260104.md](../research/investigations/RQ-01-PIPELINE-ARCHITECTURE-20260104.md) |
| CLI patterns          | [RQ-02-CLI-DESIGN-20260104.md](../research/investigations/RQ-02-CLI-DESIGN-20260104.md)                       |
| Error handling        | [RQ-14-ERROR-HANDLING-20260104.md](../research/investigations/RQ-14-ERROR-HANDLING-20260104.md)               |
| Configuration system  | [RQ-03-CONFIGURATION-SYSTEM-20260104.md](../research/investigations/RQ-03-CONFIGURATION-SYSTEM-20260104.md)   |
| vidosy patterns       | [12-vidosy-20260102.md](../research/12-vidosy-20260102.md)                                                    |

---

## 7. Definition of Done

Phase 5 is complete when:

- [ ] `cm generate "topic"` produces video.mp4
- [ ] `cm init` creates valid configuration
- [ ] Progress reporting is clear
- [ ] Error recovery works
- [ ] All unit tests pass
- [ ] E2E test passes
- [ ] README updated with usage examples

---

## 8. Post-MVP Roadmap

After Phase 5 completes the MVP, future phases include:

### Phase 6: Background Music (Weeks 11-12)

- Music selection/generation
- Audio mixing with voice
- Volume ducking

### Phase 7: Multi-Provider Support (Weeks 13-14)

- Additional TTS engines (EdgeTTS, ElevenLabs)
- Additional stock footage (Pixabay, Unsplash)
- Additional LLM providers

### Phase 8: Web Dashboard (Weeks 15-18)

- Video preview interface
- Job queue and history
- Asset management

### Phase 9: Auto-Upload (Weeks 19-20)

- TikTok API integration
- YouTube Shorts support
- Instagram Reels support

---

**Previous Phase:** [IMPL-PHASE-4-RENDER-20260105.md](IMPL-PHASE-4-RENDER-20260105.md)  
**Next:** MVP Complete! 🎉
