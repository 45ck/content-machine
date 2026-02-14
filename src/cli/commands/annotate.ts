import { Command } from 'commander';
import { handleCommandError } from '../utils';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { writeStderrLine, writeStdoutLine } from '../output';

interface AnnotateCommandOptions {
  pairs: string;
  output: string;
  port: number;
}

export const annotateCommand = new Command('annotate')
  .description('Launch interactive web UI for video preference annotation')
  .requiredOption('--pairs <dir>', 'Directory containing video pairs')
  .option('-o, --output <path>', 'Output JSONL file for preferences', 'preferences.jsonl')
  .option('--port <n>', 'Server port', '8765')
  .action(async (options: AnnotateCommandOptions) => {
    try {
      const scriptPath = resolve(process.cwd(), 'scripts', 'preference_server.py');
      const port = Number(options.port);

      writeStderrLine(`Starting preference annotation server on port ${port}...`);
      writeStderrLine(`Video pairs: ${options.pairs}`);
      writeStderrLine(`Output file: ${options.output}`);
      writeStderrLine(`Open http://localhost:${port} in your browser`);
      writeStderrLine(`Press Ctrl+C to stop the server\n`);

      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const child = spawn(
        pythonPath,
        [
          scriptPath,
          '--pairs-dir',
          options.pairs,
          '--output',
          options.output,
          '--port',
          String(port),
        ],
        {
          stdio: 'inherit',
        }
      );

      child.on('error', (error) => {
        writeStderrLine(`Failed to start server: ${error.message}`);
        process.exit(1);
      });

      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          writeStderrLine(`Server exited with code ${code}`);
          process.exit(code);
        }
        writeStdoutLine(options.output);
        process.exit(0);
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        writeStderrLine('\nShutting down server...');
        child.kill('SIGINT');
      });
    } catch (error) {
      handleCommandError(error);
    }
  });
