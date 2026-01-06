/**
 * Validate command - Post-render video validation gates
 *
 * Usage: cm validate video.mp4 --profile portrait
 */
import { Command } from 'commander';
import ora from 'ora';
import { handleCommandError, writeOutputFile } from '../utils';
import { validateVideoPath } from '../../validate/validate';
import { logger } from '../../core/logger';
import { isValidateProfileId, type ValidateProfileId } from '../../validate/profiles';
import { CMError } from '../../core/errors';

export const validateCommand = new Command('validate')
  .description('Validate a rendered video against platform requirements')
  .argument('<videoPath>', 'Path to the rendered video (e.g., video.mp4)')
  .option('--profile <profile>', 'Validation profile (portrait|landscape)', 'portrait')
  .option('-o, --output <path>', 'Output report file path', 'validate.json')
  .option('--json', 'Print the full report JSON to stdout', false)
  .action(async (videoPath: string, options) => {
    const spinner = ora('Validating video...').start();

    try {
      if (!isValidateProfileId(options.profile)) {
        throw new CMError('INVALID_ARGUMENT', `Unknown profile: ${options.profile}`, {
          allowed: ['portrait', 'landscape'],
        });
      }
      const profile: ValidateProfileId = options.profile;

      logger.info({ videoPath, profile }, 'Starting video validation');

      const report = await validateVideoPath(videoPath, { profile });

      await writeOutputFile(options.output, report);

      if (options.json) {
        spinner.stop();
        console.log(JSON.stringify(report, null, 2));
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
        `   Summary: ${report.summary.width}x${report.summary.height} • ${report.summary.durationSeconds.toFixed(
          1
        )}s • ${report.summary.container}/${report.summary.videoCodec}/${report.summary.audioCodec}`
      );
      console.log(`   Report: ${options.output}\n`);

      if (!report.passed) {
        for (const gate of report.gates.filter((gate) => !gate.passed)) {
          console.log(`✗ ${gate.gateId}: ${gate.message}`);
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
