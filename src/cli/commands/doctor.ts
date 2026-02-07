/**
 * Doctor command - environment and dependency diagnostics
 *
 * Usage: cm doctor [--strict]
 */
import { Command } from 'commander';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { runDoctor } from '../../core/doctor';
import type { DoctorCheck } from '../../core/doctor';
import { chalk } from '../colors';

function formatStatus(status: DoctorCheck['status']): string {
  if (status === 'ok') return chalk.green('OK ');
  if (status === 'warn') return chalk.yellow('WARN');
  return chalk.red('FAIL');
}

function toErrorList(checks: DoctorCheck[], strict: boolean) {
  return checks
    .filter((check) => check.status === 'fail' || (strict && check.status === 'warn'))
    .map((check) => {
      const context: Record<string, unknown> = {
        id: check.id,
        label: check.label,
        status: check.status,
      };
      if (check.detail) context.detail = check.detail;
      if (check.fix) context.fix = check.fix;
      return {
        code: check.code ?? 'DOCTOR_FAILED',
        message: check.detail ? `${check.label}: ${check.detail}` : `${check.label} failed`,
        context,
      };
    });
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose common setup and dependency issues')
  .option('--strict', 'Fail if any warnings are present', false)
  .action(async (options: { strict?: boolean }) => {
    try {
      const runtime = getCliRuntime();
      const strict = Boolean(options.strict);

      const report = await runDoctor({ strict });
      const exitCode = report.ok ? 0 : 1;

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'doctor',
            args: { strict },
            outputs: { ok: report.ok, strict: report.strict, checks: report.checks },
            errors: toErrorList(report.checks, strict),
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exitCode = exitCode;
        return;
      }

      writeStderrLine(report.ok ? 'Doctor: OK' : 'Doctor: FAILED');
      for (const check of report.checks) {
        const detail = check.detail ? ` - ${check.detail}` : '';
        writeStderrLine(`- ${formatStatus(check.status)} ${check.label}${detail}`);
        if (check.fix && (check.status === 'fail' || (strict && check.status === 'warn'))) {
          writeStderrLine(`  Fix: ${check.fix}`);
        }
      }
      process.exitCode = exitCode;
    } catch (error) {
      handleCommandError(error);
    }
  })
  .showHelpAfterError();
