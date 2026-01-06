/**
 * Validate command - Post-render video validation gates
 *
 * Usage: cm validate video.mp4 --profile portrait
 */
import { Command } from 'commander';
import { handleCommandError, writeOutputFile } from '../utils';
import { validateVideoPath } from '../../validate/validate';
import { logger } from '../../core/logger';
import { isValidateProfileId, type ValidateProfileId } from '../../validate/profiles';
import { CMError } from '../../core/errors';
import { PiqBrisqueAnalyzer } from '../../validate/quality';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';

export const validateCommand = new Command('validate')
  .description('Validate a rendered video against platform requirements')
  .argument('<videoPath>', 'Path to the rendered video (e.g., video.mp4)')
  .option('--profile <profile>', 'Validation profile (portrait|landscape)', 'portrait')
  .option('--probe-engine <engine>', 'Probe engine (ffprobe|python)', 'ffprobe')
  .option('--ffprobe <path>', 'ffprobe executable path', 'ffprobe')
  .option('--python <path>', 'python executable path (for --probe-engine python)', 'python')
  .option('--cadence', 'Enable cadence gate (scene cut frequency) via ffmpeg', false)
  .option('--cadence-max-median <seconds>', 'Max median cut interval in seconds', '3')
  .option('--cadence-threshold <n>', 'ffmpeg scene change threshold', '0.3')
  .option('--quality', 'Enable visual quality gate (BRISQUE) via Python', false)
  .option('--quality-sample-rate <n>', 'Analyze every Nth frame (BRISQUE)', '30')
  .option('-o, --output <path>', 'Output report file path', 'validate.json')
  .option('--json', 'Print the full report JSON to stdout', false)
  .action(async (videoPath: string, options) => {
    const spinner = createSpinner('Validating video...').start();
    const runtime = getCliRuntime();
    const jsonMode = runtime.json || Boolean(options.json);

    try {
      if (!isValidateProfileId(options.profile)) {
        throw new CMError('INVALID_ARGUMENT', `Unknown profile: ${options.profile}`, {
          allowed: ['portrait', 'landscape'],
          fix: 'Use --profile portrait or --profile landscape',
        });
      }
      const profile: ValidateProfileId = options.profile;

      logger.info({ videoPath, profile }, 'Starting video validation');

      const report = await validateVideoPath(videoPath, {
        profile,
        probe: {
          engine: String(options.probeEngine) === 'python' ? 'python' : 'ffprobe',
          ffprobePath: String(options.ffprobe),
          pythonPath: String(options.python),
        },
        cadence: options.cadence
          ? {
              enabled: true,
              maxMedianCutIntervalSeconds: Number.parseFloat(String(options.cadenceMaxMedian)),
              threshold: Number.parseFloat(String(options.cadenceThreshold)),
            }
          : { enabled: false },
        quality: options.quality
          ? {
              enabled: true,
              sampleRate: Number.parseInt(String(options.qualitySampleRate), 10),
              analyzer: new PiqBrisqueAnalyzer({ pythonPath: String(options.python) }),
            }
          : { enabled: false },
      });

      await writeOutputFile(options.output, report);

      if (jsonMode) {
        const failingGates = report.gates.filter((gate) => !gate.passed).map((gate) => gate.gateId);
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'validate',
            args: {
              videoPath,
              profile,
              output: options.output,
              probeEngine: options.probeEngine,
              cadence: Boolean(options.cadence),
              quality: Boolean(options.quality),
            },
            outputs: {
              reportPath: options.output,
              passed: report.passed,
              failingGates,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      if (report.passed) {
        spinner.succeed('Validation passed');
      } else {
        spinner.fail('Validation failed');
      }

      console.log(`\nVideo: ${report.videoPath}`);
      console.log(`   Profile: ${report.profile}`);
      console.log(
        `   Summary: ${report.summary.width}x${report.summary.height} ${report.summary.durationSeconds.toFixed(
          1
        )}s ${report.summary.container}/${report.summary.videoCodec}/${report.summary.audioCodec}`
      );
      console.log(`   Report: ${options.output}\n`);

      if (!report.passed) {
        for (const gate of report.gates.filter((gate) => !gate.passed)) {
          console.log(`- ${gate.gateId}: ${gate.message}`);
          console.log(`  Fix: ${gate.fix}`);
        }
        console.log('');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Validation failed');
      handleCommandError(error);
    }
  });
