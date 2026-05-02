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

async function directoryHasEntries(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length > 0;
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

function rewriteHarnessCommands(markdown: string, packageName: string): string {
  return markdown
    .replace(
      /entrypoint:\s+node --import tsx scripts\/harness\/([A-Za-z0-9.-]+\.ts)/g,
      (_match, scriptName: string) => `entrypoint: ${packagedEntrypoint(packageName, scriptName)}`
    )
    .replace(
      /node --import tsx scripts\/harness\/([A-Za-z0-9.-]+\.ts)/g,
      (_match, scriptName: string) => packagedEntrypoint(packageName, scriptName)
    );
}

function relativeTargetPrefix(targetDir: string): string {
  return (relative(process.cwd(), targetDir) || '.').replace(/\\/g, '/');
}

async function rewriteSkillMarkdown(params: {
  skillsDir: string;
  targetDir: string;
  packageName: string;
}) {
  const files = await collectFiles(params.skillsDir);
  const targetPrefix = relativeTargetPrefix(params.targetDir);

  for (const file of files) {
    if (file.endsWith(`${join('examples', 'request.json')}`)) {
      continue;
    }

    if (!file.endsWith('SKILL.md') && !file.endsWith('README.md')) {
      continue;
    }

    let markdown = await readFile(file, 'utf8');
    markdown = rewriteHarnessCommands(markdown, params.packageName);
    markdown = markdown.replace(
      /cat skills\/([^/\n]+\/examples\/request\.json)/g,
      `cat ${targetPrefix}/skills/$1`
    );
    await writeFile(file, markdown, 'utf8');
  }
}

async function rewriteFlowFiles(params: {
  flowsDir: string;
  targetDir: string;
  packageName: string;
}) {
  const files = await collectFiles(params.flowsDir);
  const targetPrefix = relativeTargetPrefix(params.targetDir);

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.flow')) {
      continue;
    }

    let text = await readFile(file, 'utf8');
    text = rewriteHarnessCommands(text, params.packageName);

    if (file.endsWith('.flow') && targetPrefix !== '.') {
      text = text.replace(/^operatorNotes:\s+flows\//gm, `operatorNotes: ${targetPrefix}/flows/`);
    }

    await writeFile(file, text, 'utf8');
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
  const targetPrefix = relativeTargetPrefix(params.targetDir);
  const runner = `node ./node_modules/${params.packageName}/agent/run-tool.mjs`;
  const text = `# Content Machine Skill Pack

This directory is a portable copy of the Content Machine skill pack for
coding-agent harnesses such as Codex CLI, Claude Code, Cursor, and other
repo-aware agents.

## Tell Your Agent This

> Use Content Machine from \`${targetPrefix}\`. Read
> \`${targetPrefix}/skills/README.md\` first, choose the right skill or
> flow, run tools through \`${runner}\`, write artifacts under
> \`runs/<run-id>/\`, and only call a video ready when publish-prep
> passes.

If your harness only auto-loads root instructions, copy the relevant
rules from \`${targetPrefix}/AGENTS.md\` into the project root
\`AGENTS.md\`, \`CLAUDE.md\`, or equivalent harness instruction file.

## What Was Installed

- Skills live under \`${targetPrefix}/skills/\`
${params.includeFlows ? `- Flows live under \`${targetPrefix}/flows/\`\n` : ''}- The packaged runner lives at \`${runner}\`

## Run From Project Root

\`\`\`bash
npm install ${params.packageName}
\`\`\`

List available runtime tools:

\`\`\`bash
${runner} list
\`\`\`

The same command is also available through the local npm bin after
install:

\`\`\`bash
npx cm-agent list
\`\`\`

List installed skills:

\`\`\`bash
cat <<'JSON' | ${runner} skill-catalog
{
  "skillsDir": "${targetPrefix}/skills",
  "includeExamples": true
}
JSON
\`\`\`

Run a direct skill example:

\`\`\`bash
cat ${targetPrefix}/skills/generate-short/examples/request.json | \\
  ${runner} generate-short
\`\`\`

${
  params.includeFlows
    ? `Run an installed flow:

\`\`\`bash
cat <<'JSON' | ${runner} run-flow
{
  "flowsDir": "${targetPrefix}/flows",
  "flow": "generate-short",
  "runId": "demo-run",
  "input": {
    "topic": "Redis vs PostgreSQL for caching",
    "publishPrep": { "enabled": true, "platform": "tiktok" }
  }
}
JSON
\`\`\`

`
    : ''
}## Operating Rules

- Ask for outcomes, not flags: "make a Reddit story short" or "turn
  this long video into three candidate shorts."
- Choose the archetype or skill before rendering.
- Keep source media, rights notes, generated assets, captions, and
  publish-prep output inspectable under \`runs/\`.
- Do not treat a render as publish-ready unless the review gate passes.
- Use \`overwrite: true\` on the install command when intentionally
  refreshing this pack.
`;
  await writeFile(readmePath, text, 'utf8');
}

async function writePackAgentGuide(params: {
  targetDir: string;
  packageName: string;
  includeFlows: boolean;
}) {
  const agentGuidePath = join(params.targetDir, 'AGENTS.md');
  const targetPrefix = relativeTargetPrefix(params.targetDir);
  const runner = `node ./node_modules/${params.packageName}/agent/run-tool.mjs`;
  const text = `# Content Machine Installed Pack

These instructions apply to the materialized Content Machine pack in
\`${targetPrefix}\`.

## Role Split

- \`skills/\` tells the agent when and how to do a specific video job.
${params.includeFlows ? '- `flows/` tells the agent how to run multi-step jobs.\n' : ''}- \`npx cm-agent <tool>\` is the short runtime bridge for JSON-stdio tool calls.
- \`${runner}\` is the explicit runner path if npm bins are unavailable.

## How To Use It

1. Read \`${targetPrefix}/skills/README.md\`, then the relevant
   \`skills/<name>/SKILL.md\`.
2. If the request is multi-step, use \`run-flow\` and pass
   \`"flowsDir": "${targetPrefix}/flows"\`.
3. If the request is one stage, call the direct tool named by the skill.
4. Write artifacts under \`runs/<run-id>/\` unless the user asks for a
   different output directory.
5. Run publish-prep or the skill's listed validation before saying a
   video is ready.

## Useful Commands

\`\`\`bash
npx cm-agent list

cat <<'JSON' | npx cm-agent skill-catalog
{
  "skillsDir": "${targetPrefix}/skills",
  "includeExamples": true
}
JSON

cat <<'JSON' | npx cm-agent doctor-report
{
  "strict": false
}
JSON
\`\`\`

## Human Prompt Pattern

When the user asks for video work, prefer this interpretation:

> Pick the right Content Machine skill or flow, explain the lane briefly,
> run the needed JSON-stdio tools, keep artifacts inspectable, and only
> call the output ready when validation passes.
`;
  await writeFile(agentGuidePath, text, 'utf8');
  return agentGuidePath;
}

/** Materialize a portable skill pack that points to the installed npm package. */
export async function installSkillPack(request: InstallSkillPackRequest): Promise<
  HarnessToolResult<{
    targetDir: string;
    skillsDir: string;
    flowsDir: string | null;
    readmePath: string;
    agentGuidePath: string;
    packageName: string;
  }>
> {
  const normalized = InstallSkillPackRequestSchema.parse(request);
  const targetDir = resolve(normalized.targetDir);
  const skillsDir = join(targetDir, 'skills');
  const flowsDir = normalized.includeFlows ? join(targetDir, 'flows') : null;
  const readmePath = join(targetDir, 'README.md');
  const agentGuidePath = join(targetDir, 'AGENTS.md');

  const targetHasContent = await directoryHasEntries(targetDir);
  if (targetHasContent && !normalized.overwrite) {
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
  if (flowsDir) {
    await rewriteFlowFiles({
      flowsDir,
      targetDir,
      packageName: normalized.packageName,
    });
  }
  await writePackReadme({
    targetDir,
    packageName: normalized.packageName,
    includeFlows: normalized.includeFlows,
  });
  await writePackAgentGuide({
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
      agentGuidePath,
      packageName: normalized.packageName,
    },
    artifacts: [
      artifactDirectory(targetDir, 'Materialized skill pack directory'),
      artifactDirectory(skillsDir, 'Materialized skills directory'),
      ...(flowsDir ? [artifactDirectory(flowsDir, 'Materialized flows directory')] : []),
      artifactFile(readmePath, 'Skill pack README'),
      artifactFile(agentGuidePath, 'Skill pack agent instructions'),
    ],
  };
}
