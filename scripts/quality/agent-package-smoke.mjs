#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), 'cm-agent-package-smoke-'));
const packDir = join(tempRoot, 'pack');
const appDir = join(tempRoot, 'app');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    input: options.input,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(' ')} failed with exit ${result.status}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result.stdout;
}

function parseTrailingJsonArray(stdout) {
  const trimmed = stdout.trim();
  const start = trimmed.lastIndexOf('\n[');
  return JSON.parse(start >= 0 ? trimmed.slice(start + 1) : trimmed);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, 'package.json'), '{"private":true,"type":"module"}\n');

  const packOutput = run('npm', ['pack', '--pack-destination', packDir, '--json']);
  const [packInfo] = parseTrailingJsonArray(packOutput);
  const tarballPath = isAbsolute(packInfo.filename)
    ? packInfo.filename
    : join(packDir, packInfo.filename);

  const packedPaths = new Set((packInfo.files ?? []).map((entry) => entry.path));
  for (const requiredPath of [
    'dist/index.js',
    'dist/index.cjs',
    'dist/cli/index.cjs',
    'agent/run-tool.mjs',
    'agent/install.mjs',
    'skills/README.md',
    'flows/README.md',
  ]) {
    assert(packedPaths.has(requiredPath), `packed tarball is missing ${requiredPath}`);
  }

  run('npm', ['install', tarballPath, '--silent'], { cwd: appDir });

  const list = JSON.parse(run('npx', ['--no-install', 'cm-agent', 'list'], { cwd: appDir }));
  for (const tool of [
    'install-skill-pack',
    'flow-catalog',
    'longform-clip-extract',
    'run-flow',
    'skill-catalog',
  ]) {
    assert(list.tools.includes(tool), `cm-agent list is missing ${tool}`);
  }

  const installDefault = JSON.parse(
    run(
      'npx',
      [
        '--no-install',
        'cm-install',
        '--target',
        '.content-machine',
        '--write-instructions',
        '--json',
      ],
      {
        cwd: appDir,
      }
    )
  );
  assert(installDefault.ok === true, 'cm-install default did not report ok=true');
  assert(existsSync(join(appDir, '.content-machine', 'AGENTS.md')), 'AGENTS.md was not installed');
  assert(existsSync(join(appDir, 'AGENTS.md')), 'root AGENTS.md was not written');
  assert(
    installDefault.result.instructionFilePath.endsWith('AGENTS.md'),
    'cm-install did not report root AGENTS.md'
  );
  const rootAgents = readFileSync(join(appDir, 'AGENTS.md'), 'utf8');
  assert(
    rootAgents.includes('<!-- BEGIN CONTENT MACHINE INSTALL v:1 -->'),
    'root AGENTS.md is missing managed start marker'
  );
  assert(
    rootAgents.includes('<!-- END CONTENT MACHINE INSTALL -->'),
    'root AGENTS.md is missing managed end marker'
  );
  assert(rootAgents.includes('.content-machine/skills/'), 'root AGENTS.md is missing skills path');
  assert(rootAgents.includes('.content-machine/flows/'), 'root AGENTS.md is missing flows path');
  assert(
    rootAgents.includes('npx --no-install cm-agent'),
    'root AGENTS.md is missing cm-agent runner'
  );

  const skillCatalog = JSON.parse(
    run('npx', ['--no-install', 'cm-agent', 'skill-catalog'], {
      cwd: appDir,
      input: '{"skillsDir":".content-machine/skills","includeExamples":true}\n',
    })
  );
  assert(skillCatalog.result.skillCount > 0, 'installed skill catalog is empty');

  const flowCatalog = JSON.parse(
    run('npx', ['--no-install', 'cm-agent', 'flow-catalog'], {
      cwd: appDir,
      input: '{"flowsDir":".content-machine/flows"}\n',
    })
  );
  assert(flowCatalog.result.flowCount > 0, 'installed flow catalog is empty');

  const refresh = JSON.parse(
    run(
      'npx',
      [
        '--no-install',
        'cm-install',
        '--target',
        '.content-machine',
        '--overwrite',
        '--no-flows',
        '--no-examples',
        '--instruction-file',
        'CLAUDE.md',
        '--json',
      ],
      { cwd: appDir }
    )
  );
  assert(refresh.ok === true, 'cm-install refresh did not report ok=true');
  assert(refresh.result.flowsDir === null, 'no-flows refresh still reported flowsDir');
  assert(
    refresh.result.instructionFilePath.endsWith('CLAUDE.md'),
    'cm-install did not report CLAUDE.md instruction path'
  );
  assert(
    refresh.artifacts.some((artifact) => artifact.description === 'Root harness instructions'),
    'cm-install did not report root instruction artifact'
  );
  assert(!existsSync(join(appDir, '.content-machine', 'flows')), 'no-flows refresh left flows dir');
  assert(existsSync(join(appDir, 'CLAUDE.md')), 'CLAUDE.md instruction file was not written');
  const rootClaude = readFileSync(join(appDir, 'CLAUDE.md'), 'utf8');
  assert(
    rootClaude.includes('<!-- BEGIN CONTENT MACHINE INSTALL v:1 -->'),
    'CLAUDE.md is missing managed start marker'
  );
  assert(!rootClaude.includes('.content-machine/flows/'), 'CLAUDE.md still references flows');
  assert(
    !existsSync(join(appDir, '.content-machine', 'skills', 'generate-short', 'examples')),
    'no-examples refresh left generate-short examples'
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        tarball: tarballPath,
        packedFiles: packInfo.entryCount,
        unpackedSize: packInfo.unpackedSize,
        tools: list.tools.length,
        skills: skillCatalog.result.skillCount,
        flows: flowCatalog.result.flowCount,
      },
      null,
      2
    )}\n`
  );
} finally {
  if (process.env.CM_KEEP_PACKAGE_SMOKE !== '1') {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
