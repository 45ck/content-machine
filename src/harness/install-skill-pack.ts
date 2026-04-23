import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { artifactDirectory, artifactFile, type HarnessToolResult } from './json-stdio';

function resolvePackageRoot(startDir: string): string {
  let currentDir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(currentDir, 'package.json')) && existsSync(join(currentDir, 'skills'))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  throw new Error(`Could not resolve package root from ${startDir}`);
}

const repoRoot = resolvePackageRoot(dirname(fileURLToPath(import.meta.url)));
const skillSourceDir = join(repoRoot, 'skills');
const flowSourceDir = join(repoRoot, 'flows');

export const InstallSkillPackRequestSchema = z
  .object({
    targetDir: z.string().min(1).default('.content-machine'),
    packageName: z.string().min(1).default('@45ck/content-machine'),
    includeFlows: z.boolean().default(true),
    includeExamples: z.boolean().default(true),
    overwrite: z.boolean().default(false),
  })
  .strict();

export type InstallSkillPackRequest = z.input<typeof InstallSkillPackRequestSchema>;

function packagedEntrypoint(packageName: string, scriptName: string): string {
  const toolName = scriptName.replace(/\.ts$/, '');
  return `node ./node_modules/${packageName}/agent/run-tool.mjs ${toolName}`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(params: { source: string; target: string; overwrite: boolean }) {
  if (params.overwrite) {
    await rm(params.target, { recursive: true, force: true });
  }
  await cp(params.source, params.target, {
    recursive: true,
    errorOnExist: !params.overwrite,
    force: params.overwrite,
  });
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }
    files.push(absolutePath);
  }

  return files;
}

async function rewriteSkillMarkdown(params: {
  skillsDir: string;
  targetDir: string;
  packageName: string;
}) {
  const files = await collectFiles(params.skillsDir);
  const relativeTargetDir = relative(process.cwd(), params.targetDir) || '.';
  const targetPrefix = relativeTargetDir.replace(/\\/g, '/');

  for (const file of files) {
    if (file.endsWith(`${join('examples', 'request.json')}`)) {
      continue;
    }

    if (!file.endsWith('SKILL.md') && !file.endsWith('README.md')) {
      continue;
    }

    let markdown = await readFile(file, 'utf8');
    markdown = markdown.replace(
      /entrypoint:\s+node --import tsx scripts\/harness\/([A-Za-z0-9.-]+\.ts)/g,
      (_match, scriptName: string) =>
        `entrypoint: ${packagedEntrypoint(params.packageName, scriptName)}`
    );
    markdown = markdown.replace(
      /node --import tsx scripts\/harness\/([A-Za-z0-9.-]+\.ts)/g,
      (_match, scriptName: string) => packagedEntrypoint(params.packageName, scriptName)
    );
    markdown = markdown.replace(
      /cat skills\/([^/\n]+\/examples\/request\.json)/g,
      `cat ${targetPrefix}/skills/$1`
    );
    await writeFile(file, markdown, 'utf8');
  }
}

async function pruneMaterializedPack(params: { skillsDir: string; flowsDir: string | null }) {
  await rm(join(params.skillsDir, '_template'), { recursive: true, force: true });
  if (params.flowsDir) {
    await rm(join(params.flowsDir, '_template'), { recursive: true, force: true });
  }
}

async function maybeStripExamples(skillsDir: string) {
  const files = await collectFiles(skillsDir);
  const exampleDirs = new Set(
    files
      .filter((file) => file.endsWith(`${join('examples', 'request.json')}`))
      .map((file) => dirname(file))
  );

  for (const dir of exampleDirs) {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writePackReadme(params: {
  targetDir: string;
  packageName: string;
  includeFlows: boolean;
}) {
  const readmePath = join(params.targetDir, 'README.md');
  const text = `# Content Machine Skill Pack

This directory is a portable copy of the Content Machine skill pack for coding-agent CLIs.

## Install

\`\`\`bash
npm install ${params.packageName}
\`\`\`

## Use

- Skills live under \`skills/\`
${params.includeFlows ? '- Flows live under `flows/`\n' : ''}- The packaged runner lives at \`./node_modules/${params.packageName}/agent/run-tool.mjs\`

Example:

\`\`\`bash
cat skills/generate-short/examples/request.json | \\
  node ./node_modules/${params.packageName}/agent/run-tool.mjs generate-short
\`\`\`

The copied \`SKILL.md\` files already point at the packaged runner, so an agent can use them directly from this directory.
`;
  await writeFile(readmePath, text, 'utf8');
}

/** Materialize a portable skill pack that points to the installed npm package. */
export async function installSkillPack(request: InstallSkillPackRequest): Promise<
  HarnessToolResult<{
    targetDir: string;
    skillsDir: string;
    flowsDir: string | null;
    readmePath: string;
    packageName: string;
  }>
> {
  const normalized = InstallSkillPackRequestSchema.parse(request);
  const targetDir = resolve(normalized.targetDir);
  const skillsDir = join(targetDir, 'skills');
  const flowsDir = normalized.includeFlows ? join(targetDir, 'flows') : null;
  const readmePath = join(targetDir, 'README.md');

  const existingReadme = await pathExists(readmePath);
  if (existingReadme && !normalized.overwrite) {
    const error = new Error(`Target already exists: ${targetDir}`);
    (error as Error & { code: string }).code = 'TARGET_EXISTS';
    throw error;
  }

  await mkdir(targetDir, { recursive: true });
  await copyDirectory({
    source: skillSourceDir,
    target: skillsDir,
    overwrite: normalized.overwrite,
  });
  if (flowsDir) {
    await copyDirectory({
      source: flowSourceDir,
      target: flowsDir,
      overwrite: normalized.overwrite,
    });
  }

  await pruneMaterializedPack({ skillsDir, flowsDir });
  if (!normalized.includeExamples) {
    await maybeStripExamples(skillsDir);
  }
  await rewriteSkillMarkdown({
    skillsDir,
    targetDir,
    packageName: normalized.packageName,
  });
  await writePackReadme({
    targetDir,
    packageName: normalized.packageName,
    includeFlows: normalized.includeFlows,
  });

  return {
    result: {
      targetDir,
      skillsDir,
      flowsDir,
      readmePath,
      packageName: normalized.packageName,
    },
    artifacts: [
      artifactDirectory(targetDir, 'Materialized skill pack directory'),
      artifactDirectory(skillsDir, 'Materialized skills directory'),
      ...(flowsDir ? [artifactDirectory(flowsDir, 'Materialized flows directory')] : []),
      artifactFile(readmePath, 'Skill pack README'),
    ],
  };
}
