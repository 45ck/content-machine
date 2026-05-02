#!/usr/bin/env node
import { installSkillPack } from '../dist/index.js';

const DEFAULT_TARGET_DIR = '.content-machine';
const DEFAULT_PACKAGE_NAME = '@45ck/content-machine';

function printHelp(stream = process.stdout) {
  stream.write(`Usage: cm-install [options]

Materialize the Content Machine skill pack into the current project.

Options:
  --target <dir>          Target directory (default: ${DEFAULT_TARGET_DIR})
  --package-name <name>   Package used in generated runner commands (default: ${DEFAULT_PACKAGE_NAME})
  --no-flows              Do not copy flow manifests
  --no-examples           Do not copy skill example request files
  --overwrite, --force    Replace an existing target directory
  --json                  Print JSON output
  --help, -h              Show this help
`);
}

function readFlagValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(args) {
  const request = {
    targetDir: DEFAULT_TARGET_DIR,
    packageName: DEFAULT_PACKAGE_NAME,
    includeFlows: true,
    includeExamples: true,
    overwrite: false,
  };
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      return { help: true, json, request };
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--overwrite' || arg === '--force') {
      request.overwrite = true;
      continue;
    }
    if (arg === '--no-flows') {
      request.includeFlows = false;
      continue;
    }
    if (arg === '--no-examples') {
      request.includeExamples = false;
      continue;
    }
    if (arg === '--target') {
      request.targetDir = readFlagValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith('--target=')) {
      request.targetDir = arg.slice('--target='.length);
      continue;
    }
    if (arg === '--package-name') {
      request.packageName = readFlagValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith('--package-name=')) {
      request.packageName = arg.slice('--package-name='.length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { help: false, json, request };
}

function printHumanResult(result) {
  const { targetDir, skillsDir, flowsDir, readmePath, agentGuidePath, packageName } = result.result;
  process.stdout.write(`Content Machine skill pack installed.

Target: ${targetDir}
Skills: ${skillsDir}
${flowsDir ? `Flows: ${flowsDir}\n` : ''}README: ${readmePath}
Agent guide: ${agentGuidePath}
Package runner: node ./node_modules/${packageName}/agent/run-tool.mjs

Next:
1. Read ${readmePath}
2. Read ${agentGuidePath}
3. Run: npx cm-agent list
`);
}

try {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  const result = await installSkillPack(parsed.request);
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
  } else {
    printHumanResult(result);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`cm-install failed: ${message}\n`);
  if (error?.code === 'TARGET_EXISTS') {
    process.stderr.write('Use --overwrite only when you intentionally want to refresh the pack.\n');
  } else {
    process.stderr.write('Run cm-install --help for usage.\n');
  }
  process.exit(1);
}
