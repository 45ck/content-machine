# Section Research: CLI Architecture Patterns

**Date:** 2026-01-04  
**Status:** Research Complete  
**Scope:** CLI framework, command structure, logging, and progress patterns

---

## 1. Vendor Evidence Summary

| Pattern               | Vendor Source           | Key Finding                                                                  |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| Commander.js          | vidosy, budibase        | Declarative command registration with `.command()`, `.option()`, `.action()` |
| Subcommand Pattern    | vidosy                  | `vidosy render [config]` with argument + options                             |
| Command Wrapper Class | budibase                | Abstraction for registering complex command hierarchies                      |
| CLI Logger            | vidosy                  | chalk-based icons (ℹ✓⚠✗) for human-readable output                           |
| Structured Logger     | short-video-maker-gyori | pino for JSON logs in production                                             |
| Progress Display      | remotion                | AnsiDiff for overwriteable terminal output                                   |
| Config Loading        | short-video-maker-gyori | dotenv + class-based config with validation                                  |

---

## 2. Framework Analysis

### 2.1 Framework Comparison

| Framework        | Stars | Used By          | Complexity | Best For               |
| ---------------- | ----- | ---------------- | ---------- | ---------------------- |
| **Commander.js** | 27.8k | vidosy, budibase | Simple     | Standard CLI apps ✅   |
| **yargs**        | 11.4k | Various          | Medium     | Complex arg parsing    |
| **oclif**        | 9k+   | n8n              | High       | Enterprise plugins     |
| **Ink**          | 33.7k | Claude Code      | High       | Interactive React TUIs |

### 2.2 vidosy Pattern (Recommended)

**Source:** [templates/vidosy/src/cli/index.ts](../../../templates/vidosy/src/cli/index.ts)

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

**Key Patterns:**

- Shebang for direct execution (`#!/usr/bin/env node`)
- Single `program` instance
- Subcommands via `.command('render')`
- Positional arguments via `.argument('[config]', ...)`
- Options via `.option('-o, --output <path>', ...)`
- Async action handler with try/catch
- `process.exit(1)` on error

### 2.3 budibase Command Wrapper Pattern

**Source:** [vendor/review-ui/budibase/packages/cli/src/structures/Command.ts](../../../vendor/review-ui/budibase/packages/cli/src/structures/Command.ts)

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
    let command = program.command(this.command);
    if (this.help) {
      command = command.description(getHelpDescription(this.help!));
    }
    // ... registers options and action handler
  }
}
```

**Key Patterns:**

- Fluent builder API (`.addHelp().addSubOption()`)
- Deferred registration via `.configure(program)`
- Allows organizing commands into separate modules
- Useful for complex CLIs with many subcommands

### 2.4 budibase Entry Point

**Source:** [vendor/review-ui/budibase/packages/cli/src/index.ts](../../../vendor/review-ui/budibase/packages/cli/src/index.ts)

```typescript
#!/usr/bin/env node
import './environment';
import { getCommands } from './options';
import { Command } from 'commander';

async function init() {
  const program = new Command()
    .addHelpCommand('help', getHelpDescription('Help with Budibase commands.'))
    .helpOption(false)
    .version(version);

  // Register all commands from modules
  for (let command of getCommands()) {
    command.configure(program);
  }

  await program.parseAsync(process.argv);
}

// Handle process signals
const events = ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException'];
events.forEach((event) => {
  process.on(event, (evt?: number) => {
    if (evt && !isNaN(evt)) return;
    if (evt) {
      console.error(error('Failed to run CLI command - please report:'));
      console.error(error(evt));
    }
  });
});

init().catch((err) => console.error(`Unexpected error - `, err));
```

**Key Patterns:**

- Environment import first (`./environment`)
- Async init function for top-level await
- Signal handling for graceful shutdown
- Error boundary with `.catch()`

---

## 3. Logging Patterns

### 3.1 CLI Logger (Human-Readable)

**Source:** [templates/vidosy/src/cli/utils/logger.ts](../../../templates/vidosy/src/cli/utils/logger.ts)

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

**Key Patterns:**

- Unicode icons for visual status (ℹ✓⚠✗🔍⏳)
- chalk for ANSI colors
- Debug gated by `process.env.DEBUG`
- Progress with `stdout.write` (no newline) + `clearProgress`

### 3.2 Structured Logger (Machine-Readable)

**Source:** [vendor/short-video-maker-gyori/src/config.ts](../../../vendor/short-video-maker-gyori/src/config.ts)

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

**Key Patterns:**

- JSON output for log aggregation
- ISO timestamps
- Structured context objects
- Log level from environment

### 3.3 Dual Logger Recommendation

```typescript
// Use CLI logger for interactive output
cli.info('Rendering video...');
cli.success('Video complete!');

// Use structured logger for debugging/production
logger.debug({ scene: 3, duration: 5.2 }, 'Processing scene');
logger.error({ error, stack: error.stack }, 'Render failed');
```

---

## 4. Progress Display Patterns

### 4.1 ora Spinner (Recommended)

```typescript
import ora from 'ora';

const spinner = ora('Loading configuration...').start();

try {
  spinner.text = 'Rendering video...';
  await renderVideo(config);
  spinner.succeed('Video rendered successfully');
} catch (error) {
  spinner.fail('Render failed');
  throw error;
}
```

### 4.2 cli-progress Bar

**Source:** [vendor/review-ui/budibase/packages/cli/src/utils.ts](../../../vendor/review-ui/budibase/packages/cli/src/utils.ts)

```typescript
const progress = require('cli-progress');

export function progressBar(total: number) {
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(total, 0);
  return bar;
}

// Usage
const bar = progressBar(100);
for (let i = 0; i <= 100; i++) {
  bar.update(i);
  await delay(10);
}
bar.stop();
```

### 4.3 Overwriteable Output (remotion)

**Source:** Research from [vendor/render/remotion/packages/cli/src/progress-bar.ts](../../../vendor/render/remotion/packages/cli/src/progress-bar.ts)

```typescript
import AnsiDiff from 'ansi-diff';

const diff = new AnsiDiff();

function updateProgress(message: string) {
  process.stdout.write(diff.update(message));
}

// Updates terminal in-place without scrolling
updateProgress('Rendering: 25%');
updateProgress('Rendering: 50%');
updateProgress('Rendering: 75%');
```

---

## 5. Configuration Patterns

### 5.1 Config Class Pattern

**Source:** [vendor/short-video-maker-gyori/src/config.ts](../../../vendor/short-video-maker-gyori/src/config.ts)

```typescript
import 'dotenv/config'; // Auto-loads .env file

export class Config {
  public pexelsApiKey: string;
  public logLevel: pino.Level;
  public port: number;

  constructor() {
    this.pexelsApiKey = process.env.PEXELS_API_KEY as string;
    this.logLevel = (process.env.LOG_LEVEL || 'info') as pino.Level;
    this.port = process.env.PORT ? parseInt(process.env.PORT) : 3123;
  }

  public ensureConfig() {
    if (!this.pexelsApiKey) {
      throw new Error('PEXELS_API_KEY environment variable is missing');
    }
  }
}
```

### 5.2 Config Precedence (Recommended)

```
Priority (highest to lowest):
1. CLI arguments (--port 8080)
2. Environment variables (PORT=8080)
3. Config file (.content-machine.json)
4. Defaults in code
```

### 5.3 Config with Zod Validation

```typescript
import { config } from 'dotenv';
import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  pexelsApiKey: z.string().min(1),
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

---

## 6. Recommended content-machine CLI Structure

### 6.1 Directory Layout

```
src/cli/
├── index.ts              # Entry point with Commander
├── commands/
│   ├── script.ts         # cm script
│   ├── audio.ts          # cm audio
│   ├── visuals.ts        # cm visuals
│   ├── render.ts         # cm render
│   └── generate.ts       # cm generate (full pipeline)
├── utils/
│   ├── cli-logger.ts     # chalk-based pretty output
│   ├── structured-logger.ts  # pino for JSON logs
│   ├── progress.ts       # ora spinner wrapper
│   └── config.ts         # dotenv + Zod validation
└── types/
    └── index.ts          # CLI-specific types
```

### 6.2 Entry Point

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { registerScriptCommand } from './commands/script';
import { registerAudioCommand } from './commands/audio';
import { registerVisualsCommand } from './commands/visuals';
import { registerRenderCommand } from './commands/render';
import { loadConfig } from './utils/config';

const program = new Command();

program
  .name('cm')
  .description('Content Machine - Automated short-form video generation')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-error output')
  .option('--json', 'Output results as JSON');

// Load config before each command
program.hook('preAction', (thisCommand) => {
  loadConfig(thisCommand.opts());
});

// Register pipeline commands
registerScriptCommand(program);
registerAudioCommand(program);
registerVisualsCommand(program);
registerRenderCommand(program);

program.parse();
```

### 6.3 Command Pattern

```typescript
// src/cli/commands/script.ts
import { Command } from 'commander';
import { z } from 'zod';
import ora from 'ora';
import { generateScript } from '../../script/generator';

const optionsSchema = z.object({
  topic: z.string(),
  output: z.string().optional(),
  provider: z.enum(['openai', 'anthropic']).default('openai'),
});

export function registerScriptCommand(program: Command): void {
  program
    .command('script')
    .description('Generate a video script from a topic')
    .requiredOption('-t, --topic <topic>', 'Topic for the video')
    .option('-o, --output <path>', 'Output file path', 'script.json')
    .option('-p, --provider <provider>', 'LLM provider', 'openai')
    .action(async (options) => {
      const spinner = ora('Generating script...').start();

      try {
        const opts = optionsSchema.parse(options);
        const script = await generateScript(opts);

        spinner.succeed(`Script saved to ${opts.output}`);

        if (!program.opts().quiet) {
          console.log(JSON.stringify(script, null, 2));
        }
      } catch (error) {
        spinner.fail('Script generation failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

---

## 7. Dependencies

### Core (Required)

```json
{
  "commander": "^12.0.0",
  "zod": "^3.22.0",
  "dotenv": "^16.0.0"
}
```

### Logging & Progress

```json
{
  "pino": "^9.0.0",
  "chalk": "^5.3.0",
  "ora": "^8.0.0"
}
```

### Optional (Interactive)

```json
{
  "@clack/prompts": "^0.7.0"
}
```

---

## 8. Adoption Priority

| Pattern                | Priority | Rationale                                     |
| ---------------------- | -------- | --------------------------------------------- |
| Commander.js           | P0       | Proven in vidosy, simple, TypeScript-friendly |
| chalk CLI logger       | P0       | Essential for user-friendly output            |
| ora spinner            | P0       | Clean progress indication                     |
| Zod config validation  | P0       | Type-safe config loading                      |
| dotenv                 | P0       | Standard env var loading                      |
| pino structured logger | P1       | For debugging and production logs             |
| preAction hook         | P1       | Clean config loading pattern                  |
| Command wrapper class  | P2       | Only if many subcommands                      |

---

## 9. References

### Vendor Files

- [templates/vidosy/src/cli/index.ts](../../../templates/vidosy/src/cli/index.ts) - Commander pattern
- [templates/vidosy/src/cli/utils/logger.ts](../../../templates/vidosy/src/cli/utils/logger.ts) - CLI logger
- [vendor/review-ui/budibase/packages/cli/src/structures/Command.ts](../../../vendor/review-ui/budibase/packages/cli/src/structures/Command.ts) - Wrapper pattern
- [vendor/review-ui/budibase/packages/cli/src/index.ts](../../../vendor/review-ui/budibase/packages/cli/src/index.ts) - Entry point
- [vendor/short-video-maker-gyori/src/config.ts](../../../vendor/short-video-maker-gyori/src/config.ts) - Config class

### Existing Research

- [CLI-ARCHITECTURE-RESEARCH-20260104.md](../deep-dives/CLI-ARCHITECTURE-RESEARCH-20260104.md) - Full deep dive
- [12-vidosy-20260102.md](../12-vidosy-20260102.md) - vidosy analysis
- [10-short-video-maker-gyori-20260102.md](../10-short-video-maker-gyori-20260102.md) - Config patterns

### External

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [pino Documentation](https://github.com/pinojs/pino)
- [ora Documentation](https://github.com/sindresorhus/ora)
