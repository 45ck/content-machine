# CLI Architecture Research for content-machine

**Date:** 2026-01-04  
**Status:** Research Complete  
**Scope:** TypeScript/Node.js CLI patterns for video generation pipeline

---

## Executive Summary

This research analyzes CLI architecture patterns from vendored repos and popular libraries to determine the best approach for content-machine's command-line interface. The recommendation is to use **Commander.js** for command parsing with **pino** for structured logging and **ora/chalk** for progress display.

---

## 1. CLI Framework Comparison

### 1.1 Popular Frameworks

| Framework          | Stars | Type           | Complexity | Best For                     |
| ------------------ | ----- | -------------- | ---------- | ---------------------------- |
| **Commander.js**   | 27.8k | Declarative    | Simple     | Standard CLI apps            |
| **Yargs**          | 11.4k | Declarative    | Medium     | Complex argument parsing     |
| **oclif**          | 9k+   | Full framework | High       | Enterprise CLIs with plugins |
| **Ink**            | 33.7k | React-based    | High       | Interactive terminal UIs     |
| **@clack/prompts** | -     | Interactive    | Low        | Beautiful prompts/wizards    |

### 1.2 Vendored Repo Analysis

| Repo                        | CLI Framework     | Notes                                           |
| --------------------------- | ----------------- | ----------------------------------------------- |
| **vidosy**                  | Commander.js      | Simple, clean pattern for video rendering       |
| **short-video-maker-gyori** | No CLI (REST/MCP) | Uses Express server instead                     |
| **budibase/cli**            | Commander.js      | Enterprise pattern with Command wrapper class   |
| **n8n/node-cli**            | oclif             | Heavy framework for extensible node development |
| **remotion/cli**            | minimist          | Low-level parsing, custom everything            |

### 1.3 Framework Code Examples

#### Commander.js (vidosy pattern)

**File:** [templates/vidosy/src/cli/index.ts](templates/vidosy/src/cli/index.ts)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { render } from './commands/render';
import { logger } from './utils/logger';

const program = new Command();

program.name('vidosy').description('A video generation tool using Remotion').version('1.0.0');

program
  .command('render')
  .description('Render a video from configuration')
  .argument('[config]', 'Path to configuration file', 'vidosy.json')
  .option('-o, --output <path>', 'Output file path')
  .option('-q, --quality <quality>', 'Video quality (low, medium, high)', 'high')
  .action(async (config: string, options: any) => {
    try {
      await render(config, options);
    } catch (error) {
      logger.error('Render failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

#### oclif (n8n pattern)

**File:** [vendor/orchestration/n8n/packages/@n8n/node-cli/src/commands/build.ts](vendor/orchestration/n8n/packages/@n8n/node-cli/src/commands/build.ts)

```typescript
import { cancel, intro, log, outro, spinner } from '@clack/prompts';
import { Command } from '@oclif/core';
import { rimraf } from 'rimraf';
import { runCommand } from '../utils/child-process';

export default class Build extends Command {
  static override description = 'Compile the node in the current directory';
  static override examples = ['<%= config.bin %> <%= command.id %>'];
  static override flags = {};

  async run(): Promise<void> {
    await this.parse(Build);
    intro(await getCommandHeader('n8n-node build'));

    const buildSpinner = spinner();
    buildSpinner.start('Building TypeScript files');
    await rimraf('dist');

    try {
      await runTscBuild();
      buildSpinner.stop('TypeScript build successful');
    } catch (error) {
      cancel('TypeScript build failed');
      this.exit(1);
    }

    outro('✓ Build successful');
  }
}
```

#### Command Wrapper Pattern (budibase)

**File:** [vendor/review-ui/budibase/packages/cli/src/structures/Command.ts](vendor/review-ui/budibase/packages/cli/src/structures/Command.ts)

```typescript
export class Command {
  command: string;
  opts: CommandOpt[];
  func?: Function;
  help?: string;

  constructor(command: string, func?: Function) {
    this.command = command;
    this.opts = [];
    this.func = func;
  }

  addHelp(help: string) {
    this.help = help;
    return this;
  }

  addSubOption(command: string, help: string, func?: Function, extras: any[] = []) {
    this.opts.push({ command, help, func, extras });
    return this;
  }

  configure(program: any) {
    // Registers with Commander.js
    let command = program.command(this.command);
    if (this.help) {
      command = command.description(getHelpDescription(this.help!));
    }
    // ... option configuration
  }
}
```

### 1.4 Recommendation: Commander.js

**Reasons:**

1. **Simplicity** - Declarative API, easy to learn
2. **TypeScript support** - `@commander-js/extra-typings` for type inference
3. **vidosy pattern** - Already proven in video generation context
4. **Wide adoption** - 27.8k stars, used by most vendored repos
5. **No runtime deps** - Pure JS, minimal bundle size

**When to use oclif instead:**

- Plugin system needed
- Multiple standalone executables
- Very complex command hierarchy

---

## 2. Pipeline/Stages Pattern

### 2.1 Command Chaining Patterns

#### Pattern 1: Subcommand-based (vidosy)

```bash
vidosy render config.json --output video.mp4
vidosy preview config.json
```

#### Pattern 2: Action Handler with Stages (remotion)

```typescript
// Single command, multiple internal stages
await bundleOnCliOrTakeServeUrl();
await getCompositionWithDimensionOverride();
await RenderInternals.internalRenderMedia();
```

**File:** [vendor/render/remotion/packages/cli/src/render-flows/render.ts](vendor/render/remotion/packages/cli/src/render-flows/render.ts)

```typescript
export const renderVideoFlow = async ({
  fullEntryPoint,
  onProgress,
  // ... 40+ parameters
}) => {
  // Stage 1: Bundle
  const { urlOrBundle, cleanup } = await bundleOnCliOrTakeServeUrl({...});

  // Stage 2: Get composition
  const { compositionId, config } = await getCompositionWithDimensionOverride({...});

  // Stage 3: Render
  await RenderInternals.internalRenderMedia({...});
};
```

### 2.2 JSON Input/Output for Composability

#### vidosy Config Schema

**File:** [templates/vidosy/src/shared/zod-schema.ts](templates/vidosy/src/shared/zod-schema.ts)

```typescript
import { z } from 'zod';

export const sceneSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  background: backgroundSchema.optional(),
  text: textSchema.optional(),
  audio: z
    .object({
      file: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export const vidosyConfigSchema = z.object({
  video: videoSchema,
  scenes: z.array(sceneSchema).min(1),
  audio: audioSchema.optional(),
  output: outputSchema.optional(),
});
```

#### Config Loading Pattern

**File:** [templates/vidosy/src/cli/utils/config-loader.ts](templates/vidosy/src/cli/utils/config-loader.ts)

```typescript
export async function loadConfig(configPath: string): Promise<VidosyConfig> {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const configContent = fs.readFileSync(resolvedPath, 'utf-8');
  const configData = JSON.parse(configContent);

  // Validate with Zod
  const validatedConfig = vidosyConfigSchema.parse(configData);
  return validatedConfig;
}
```

### 2.3 Recommended Pipeline Pattern for content-machine

```bash
# Single-command with JSON config
cm render --config video.json --output output.mp4

# Or piping JSON (advanced)
cat video.json | cm render --stdin --output output.mp4

# Stage-specific commands
cm capture --url https://product.com --output captures/
cm script --captures captures/ --output script.json
cm render --script script.json --output video.mp4

# Full pipeline
cm generate --topic "VS Code extensions" --product myproduct --output video.mp4
```

---

## 3. Configuration Patterns

### 3.1 Environment Variables with dotenv

**File:** [vendor/short-video-maker-gyori/src/config.ts](vendor/short-video-maker-gyori/src/config.ts)

```typescript
import 'dotenv/config'; // Auto-loads .env file

export class Config {
  public pexelsApiKey: string;
  public logLevel: pino.Level;
  public port: number;
  public whisperModel: whisperModels;

  constructor() {
    // Environment variables with defaults
    this.pexelsApiKey = process.env.PEXELS_API_KEY as string;
    this.logLevel = (process.env.LOG_LEVEL || 'info') as pino.Level;
    this.port = process.env.PORT ? parseInt(process.env.PORT) : 3123;
    this.whisperModel = (process.env.WHISPER_MODEL as whisperModels) || 'medium.en';

    // Docker-specific settings
    this.runningInDocker = process.env.DOCKER === 'true';
  }

  public ensureConfig() {
    if (!this.pexelsApiKey) {
      throw new Error('PEXELS_API_KEY environment variable is missing');
    }
  }
}
```

### 3.2 Configuration Precedence

**Recommended order (highest to lowest priority):**

1. CLI arguments (`--port 8080`)
2. Environment variables (`PORT=8080`)
3. Config file (`.content-machine.json`)
4. Defaults in code

```typescript
import { config } from 'dotenv';
import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  pexelsApiKey: z.string().optional(),
});

export function loadConfig(cliOptions: Record<string, unknown>) {
  config(); // Load .env

  const merged = {
    port: cliOptions.port ?? process.env.PORT,
    logLevel: cliOptions.logLevel ?? process.env.LOG_LEVEL,
    pexelsApiKey: process.env.PEXELS_API_KEY,
  };

  return configSchema.parse(merged);
}
```

### 3.3 RC File Pattern (cosmiconfig)

For more complex config loading, consider `cosmiconfig`:

```typescript
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('content-machine');
const result = await explorer.search();

// Searches for:
// - package.json "content-machine" key
// - .content-machinerc
// - .content-machinerc.json
// - .content-machinerc.yaml
// - content-machine.config.js
```

---

## 4. Progress/Logging Patterns

### 4.1 Structured Logging (pino)

**File:** [vendor/short-video-maker-gyori/src/config.ts](vendor/short-video-maker-gyori/src/config.ts)

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    pid: process.pid,
    version: process.env.npm_package_version,
  },
});

// Usage
logger.info('Starting server');
logger.debug({ port: 3000 }, 'Server configuration');
logger.error(error, 'Failed to render video');
```

### 4.2 CLI-Friendly Logging (chalk + icons)

**File:** [templates/vidosy/src/cli/utils/logger.ts](templates/vidosy/src/cli/utils/logger.ts)

```typescript
import chalk from 'chalk';

class Logger {
  info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green('✓'), message, ...args);
  }

  warning(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red('✗'), message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message, ...args);
    }
  }

  progress(message: string): void {
    process.stdout.write(chalk.cyan('⏳ ') + message);
  }

  clearProgress(): void {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
}

export const logger = new Logger();
```

### 4.3 Progress Bar Patterns

#### Simple Progress (cli-progress)

**File:** [vendor/review-ui/budibase/packages/cli/src/utils.ts](vendor/review-ui/budibase/packages/cli/src/utils.ts)

```typescript
const progress = require('cli-progress');

export function progressBar(total: number) {
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(total, 0);
  return bar;
}

// Usage
const bar = progressBar(100);
bar.update(50); // 50% complete
bar.stop();
```

#### Overwriteable Output (remotion pattern)

**File:** [vendor/render/remotion/packages/cli/src/progress-bar.ts](vendor/render/remotion/packages/cli/src/progress-bar.ts)

```typescript
export const createOverwriteableCliOutput = (options: {
  quiet: boolean;
  cancelSignal: CancelSignal | null;
  updatesDontOverwrite: boolean;
  indent: boolean;
}): OverwriteableCliOutput => {
  if (options.quiet) {
    return { update: () => false };
  }

  const diff = new AnsiDiff(); // Tracks terminal output changes

  return {
    update: (up: string, newline: boolean): boolean => {
      // Updates in place without scrolling
      return process.stdout.write(diff.update(up + (newline ? '\n' : '')));
    },
  };
};
```

### 4.4 @clack/prompts (Modern Interactive)

**File:** [vendor/orchestration/n8n/packages/@n8n/node-cli/src/commands/new/index.ts](vendor/orchestration/n8n/packages/@n8n/node-cli/src/commands/new/index.ts)

```typescript
import { confirm, intro, isCancel, log, note, outro, spinner } from '@clack/prompts';

export default class New extends Command {
  async run(): Promise<void> {
    intro(await createIntro());

    const nodeName = args.name ?? (await nodeNamePrompt());

    if (await folderExists(destination)) {
      const shouldOverwrite = await confirm({
        message: `./${nodeName} already exists, overwrite?`,
      });
      if (isCancel(shouldOverwrite) || !shouldOverwrite) return onCancel();
    }

    const copyingSpinner = spinner();
    copyingSpinner.start('Copying files');
    await template.run(templateData);
    copyingSpinner.stop('Files copied');

    note(`cd ./${nodeName} && npm run dev`, 'Next Steps');
    outro(`Created ./${nodeName} ✨`);
  }
}
```

### 4.5 Ink (React for CLI)

Used by: Claude Code, Gemini CLI, Cloudflare Wrangler, Prisma, Shopify CLI

```typescript
import React, { useState, useEffect } from 'react';
import { render, Text, Box, Static } from 'ink';

const App = () => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  return (
    <>
      {/* Permanent output */}
      <Static items={logs}>
        {(log) => <Text key={log.id} color="green">✔ {log.message}</Text>}
      </Static>

      {/* Live updating section */}
      <Box marginTop={1}>
        <Text>Progress: {progress}%</Text>
      </Box>
    </>
  );
};

render(<App />);
```

---

## 5. Recommended Architecture for content-machine

### 5.1 CLI Structure

```
src/cli/
├── index.ts              # Entry point with Commander setup
├── commands/
│   ├── render.ts         # cm render
│   ├── capture.ts        # cm capture
│   ├── script.ts         # cm script
│   ├── preview.ts        # cm preview
│   └── generate.ts       # cm generate (full pipeline)
├── utils/
│   ├── logger.ts         # Chalk-based CLI logger
│   ├── progress.ts       # Progress bar/spinner utilities
│   ├── config.ts         # Configuration loading
│   └── validation.ts     # Zod schema validation
└── types/
    └── index.ts          # CLI-specific types
```

### 5.2 Entry Point Pattern

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { registerRenderCommand } from './commands/render';
import { registerCaptureCommand } from './commands/capture';
import { registerGenerateCommand } from './commands/generate';
import { loadConfig } from './utils/config';

const program = new Command();

program
  .name('cm')
  .description('Content Machine - Automated short-form video generation')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-error output')
  .option('--json', 'Output results as JSON');

// Global config
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts();
  loadConfig(opts);
});

// Register commands
registerRenderCommand(program);
registerCaptureCommand(program);
registerGenerateCommand(program);

program.parse();
```

### 5.3 Command Registration Pattern

```typescript
// src/cli/commands/render.ts
import { Command } from 'commander';
import { z } from 'zod';
import ora from 'ora';
import { renderVideo } from '../../render/renderer';

const renderOptionsSchema = z.object({
  config: z.string(),
  output: z.string().optional(),
  quality: z.enum(['low', 'medium', 'high']).default('high'),
});

export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description('Render a video from configuration file')
    .argument('[config]', 'Path to configuration file', 'cm.json')
    .option('-o, --output <path>', 'Output file path')
    .option('-q, --quality <level>', 'Video quality', 'high')
    .action(async (configPath, options) => {
      const spinner = ora('Loading configuration...').start();

      try {
        const opts = renderOptionsSchema.parse({ config: configPath, ...options });
        spinner.text = 'Rendering video...';

        await renderVideo(opts, {
          onProgress: (progress) => {
            spinner.text = `Rendering: ${progress.percent}%`;
          },
        });

        spinner.succeed(`Video rendered: ${opts.output}`);
      } catch (error) {
        spinner.fail('Render failed');
        console.error(error.message);
        process.exit(1);
      }
    });
}
```

### 5.4 Dual Logger Pattern

```typescript
// src/cli/utils/logger.ts
import pino from 'pino';
import chalk from 'chalk';

// Structured logger for machine-readable output
export const structuredLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.JSON_LOGS
    ? undefined
    : {
        target: 'pino-pretty',
      },
});

// CLI logger for human-readable output
export const cli = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  step: (num: number, total: number, msg: string) =>
    console.log(chalk.dim(`[${num}/${total}]`), msg),
};
```

---

## 6. Dependencies Recommendation

### Core CLI

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "zod": "^3.22.0"
  }
}
```

### Logging & Progress

```json
{
  "dependencies": {
    "pino": "^9.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  }
}
```

### Optional (for interactive CLIs)

```json
{
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "inquirer": "^9.0.0"
  }
}
```

### Optional (for React-based CLIs)

```json
{
  "dependencies": {
    "ink": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "ink-select-input": "^6.0.0"
  }
}
```

---

## 7. Key Takeaways

1. **Use Commander.js** - Simple, proven, TypeScript-friendly
2. **Zod for validation** - Validate CLI inputs and config files
3. **Dual logging** - pino for structured, chalk for pretty CLI output
4. **ora for spinners** - Simple, elegant progress indication
5. **Config precedence** - CLI args > env vars > config file > defaults
6. **dotenv for env vars** - Standard pattern, widely adopted
7. **JSON configs** - Use Zod schemas for validation
8. **Consider Ink** - If you need complex interactive UI (like wizards)

---

## References

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Yargs API Documentation](https://yargs.js.org/docs/)
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [templates/vidosy/src/cli](templates/vidosy/src/cli) - Reference implementation
- [vendor/short-video-maker-gyori/src/config.ts](vendor/short-video-maker-gyori/src/config.ts) - Config pattern
- [vendor/render/remotion/packages/cli/src](vendor/render/remotion/packages/cli/src) - Progress patterns
