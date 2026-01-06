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
import type { ValidateOptions } from '../../validate/validate';

interface ValidateCommandOptions {
  profile: string;
  probeEngine: string;
  ffprobe: string;
  python: string;
  cadence?: boolean;
  cadenceEngine?: string;
  cadenceMaxMedian: string;
  cadenceThreshold: string;
  quality?: boolean;
  qualitySampleRate: string;
  output: string;
  json?: boolean;
}

function parseProfile(profile: string): ValidateProfileId {
  if (!isValidateProfileId(profile)) {
    throw new CMError('INVALID_ARGUMENT', `Unknown profile: ${profile}`, {
      allowed: ['portrait', 'landscape'],
      fix: 'Use --profile portrait or --profile landscape',
    });
  }
  return profile;
}

function parseCadenceEngine(engine?: string): 'ffmpeg' | 'pyscenedetect' {
  if (!engine || engine === 'ffmpeg') return 'ffmpeg';
  if (engine === 'pyscenedetect') return 'pyscenedetect';
  throw new CMError('INVALID_ARGUMENT', `Unknown cadence engine: ${engine}`, {
    allowed: ['ffmpeg', 'pyscenedetect'],
    fix: 'Use --cadence-engine ffmpeg or --cadence-engine pyscenedetect',
  });
}

function normalizeCadenceThreshold(engine: 'ffmpeg' | 'pyscenedetect', raw: number): number {
  if (!Number.isFinite(raw)) {
    throw new CMError('INVALID_ARGUMENT', 'Invalid cadence threshold value', {
      fix: 'Use a numeric --cadence-threshold value',
    });
  }
  if (engine === 'pyscenedetect' && raw <= 1) {
    return raw * 100;
  }
  return raw;
}

function buildValidateOptions(
  profile: ValidateProfileId,
  options: ValidateCommandOptions
): ValidateOptions {
  const cadenceEngine = parseCadenceEngine(options.cadenceEngine);
  return {
    profile,
    probe: {
      engine: String(options.probeEngine) === 'python' ? 'python' : 'ffprobe',
      ffprobePath: String(options.ffprobe),
      pythonPath: String(options.python),
    },
    cadence: options.cadence
      ? {
          enabled: true,
          engine: cadenceEngine,
          maxMedianCutIntervalSeconds: Number.parseFloat(String(options.cadenceMaxMedian)),
          threshold: normalizeCadenceThreshold(
            cadenceEngine,
            Number.parseFloat(String(options.cadenceThreshold))
          ),
        }
      : { enabled: false },
    quality: options.quality
      ? {
          enabled: true,
          sampleRate: Number.parseInt(String(options.qualitySampleRate), 10),
          analyzer: new PiqBrisqueAnalyzer({ pythonPath: String(options.python) }),
        }
      : { enabled: false },
  };
}

export const validateCommand = new Command('validate')
  .description('Validate a rendered video against platform requirements')
  .argument('<videoPath>', 'Path to the rendered video (e.g., video.mp4)')
  .option('--profile <profile>', 'Validation profile (portrait|landscape)', 'portrait')
  .option('--probe-engine <engine>', 'Probe engine (ffprobe|python)', 'ffprobe')
  .option('--ffprobe <path>', 'ffprobe executable path', 'ffprobe')
  .option('--python <path>', 'python executable path (for --probe-engine python)', 'python')
  .option('--cadence', 'Enable cadence gate (scene cut frequency) via ffmpeg', false)
  .option('--cadence-engine <engine>', 'Cadence engine (ffmpeg|pyscenedetect)', 'ffmpeg')
  .option('--cadence-max-median <seconds>', 'Max median cut interval in seconds', '3')
  .option(
    '--cadence-threshold <n>',
    'Scene change threshold (ffmpeg ~0-1, pyscenedetect ~0-100)',
    '0.3'
  )
  .option('--quality', 'Enable visual quality gate (BRISQUE) via Python', false)
  .option('--quality-sample-rate <n>', 'Analyze every Nth frame (BRISQUE)', '30')
  .option('-o, --output <path>', 'Output report file path', 'validate.json')
  .option('--json', 'Print the full report JSON to stdout', false)
  .action(async (videoPath: string, options: ValidateCommandOptions) => {
    const runtime = getCliRuntime();
    const jsonMode = runtime.json || Boolean(options.json);
    const spinner = createSpinner('Validating video...').start();

    try {
      const profile = parseProfile(options.profile);
      const validateOptions = buildValidateOptions(profile, options);

      if (!jsonMode) {
        logger.info({ videoPath, profile }, 'Starting video validation');
      }

      const report = await validateVideoPath(videoPath, validateOptions);
      await writeOutputFile(options.output, report);

      if (jsonMode) {
        spinner.stop();
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.passed ? 0 : 1);
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
