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
  includeExamples: boolean;
}) {
  const readmePath = join(params.targetDir, 'README.md');
  const targetPrefix = relativeTargetPrefix(params.targetDir);
  const runner = 'npx --no-install cm-agent';
  const explicitRunner = `node ./node_modules/${params.packageName}/agent/run-tool.mjs`;
  const skillOrFlow = params.includeFlows ? 'skill or flow' : 'skill';
  const text = `# Content Machine Skill Pack

This directory is a portable copy of the Content Machine skill pack for
coding-agent harnesses such as Codex CLI, Claude Code, Cursor, and other
repo-aware agents.

## Tell Your Agent This

> Use Content Machine from \`${targetPrefix}\`. Read
> \`${targetPrefix}/skills/README.md\` first, choose the right skill or
> ${params.includeFlows ? 'flow' : 'direct runtime tool'}, run tools through \`${runner}\`, write artifacts under
> \`runs/<run-id>/\`, and only call a video ready when publish-prep
> passes.

If your harness only auto-loads root instructions, copy the relevant
rules from \`${targetPrefix}/AGENTS.md\` into the project root
\`AGENTS.md\`, \`CLAUDE.md\`, or equivalent harness instruction file.

## Copy-Paste Prompts

Topic to short:

> Use Content Machine from \`${targetPrefix}\` to make a 35-second
> vertical explainer about Redis versus PostgreSQL for caching. Pick the
> lane, run the default generation path, write artifacts under
> \`runs/redis-cache-short/\`, and only call it ready if publish-prep
> passes.

Known lane:

> Use the \`reddit-post-over-gameplay\` lane for this story. Keep
> gameplay full-screen, show the Reddit opener card for 3-5 seconds, use
> bold captions, and report the final MP4 plus publish-prep artifacts.

Longform clipping:

> Turn this longform video into three candidate shorts. Analyze the
> source first, select moments, snap boundaries, ask before rendering,
> then render only the approved candidate and run publish-prep.

## What Was Installed

- Skills live under \`${targetPrefix}/skills/\`
${params.includeFlows ? `- Flows live under \`${targetPrefix}/flows/\`\n` : ''}- Runtime commands use \`${runner} <tool>\`
- Fallback runner path: \`${explicitRunner} <tool>\`

## Run From Project Root

Node.js 20.6+ is required. The npm package should already be installed
because \`cm-install\` created this pack. When refreshing, upgrade the
package first:

\`\`\`bash
npm install --save-dev ${params.packageName}@latest
npx cm-install --target ${targetPrefix} --overwrite
\`\`\`

List available runtime tools:

\`\`\`bash
${runner} list
\`\`\`

If npm bins are unavailable, use the explicit package path:

\`\`\`bash
${explicitRunner} list
\`\`\`

List installed skills:

\`\`\`bash
cat <<'JSON' | ${runner} skill-catalog
{
  "skillsDir": "${targetPrefix}/skills",
  "includeExamples": ${params.includeExamples}
}
JSON
\`\`\`

${
  params.includeExamples
    ? `Run a direct skill example:

\`\`\`bash
cat ${targetPrefix}/skills/generate-short/examples/request.json | \\
  ${runner} generate-short
\`\`\`

`
    : ''
}${
    params.includeFlows
      ? `List installed flows:

\`\`\`bash
cat <<'JSON' | ${runner} flow-catalog
{
  "flowsDir": "${targetPrefix}/flows"
}
JSON
\`\`\`

`
      : ''
  }${
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
  }Run diagnostics before real generation:

\`\`\`bash
cat <<'JSON' | ${runner} doctor-report
{
  "strict": false
}
JSON
\`\`\`

## Source-Repo Paths In Copied Docs

Some copied ${params.includeFlows ? 'skill or flow docs' : 'skill docs'} may still mention source-checkout paths
such as \`scripts/harness/\` for contributor context. In an installed
pack, treat those as reference-only and use \`${runner}\` for execution.

## Update Or Remove

- Update: \`npm install --save-dev ${params.packageName}@latest\`, then
  \`npx cm-install --target ${targetPrefix} --overwrite\`.
- Remove: delete \`${targetPrefix}/\`, remove any copied root
  instruction snippets, then run \`npm uninstall ${params.packageName}\`
  if the package is no longer needed.
- Keep or delete \`runs/\` separately; it contains user-generated
  outputs and is not part of the installed pack.

## Operating Rules

- Ask for outcomes, not flags: "make a Reddit story short" or "turn
  this long video into three candidate shorts."
- Choose the archetype or ${skillOrFlow} before rendering.
- Keep source media, rights notes, generated assets, captions, and
  publish-prep output inspectable under \`runs/\`.
- Do not treat a render as publish-ready unless the review gate passes.
`;
  await writeFile(readmePath, text, 'utf8');
}

async function writePackAgentGuide(params: {
  targetDir: string;
  packageName: string;
  includeFlows: boolean;
  includeExamples: boolean;
}) {
  const agentGuidePath = join(params.targetDir, 'AGENTS.md');
  const targetPrefix = relativeTargetPrefix(params.targetDir);
  const explicitRunner = `node ./node_modules/${params.packageName}/agent/run-tool.mjs`;
  const text = `# Content Machine Installed Pack

These instructions apply to the materialized Content Machine pack in
\`${targetPrefix}\`.

## Role Split

- \`skills/\` are decision and craft docs: when to use a capability,
  what inputs it needs, and what quality bar it must meet.
${params.includeFlows ? '- `flows/` are orchestration docs: multi-step paths, gates, and run-scoped outputs.\n' : ''}- \`cm-agent\` is execution only: use it when a skill or flow needs a
  deterministic JSON-stdio runtime tool.
- Primary runner: \`npx --no-install cm-agent <tool>\`.
- Fallback runner: \`${explicitRunner} <tool>\`.

## How To Use It

1. Choose the lane first, then choose a skill for one capability${
    params.includeFlows ? ' or a flow for a multi-step run' : ''
  }.
2. Read \`${targetPrefix}/skills/README.md\`, then the relevant
   \`skills/<name>/SKILL.md\`.
${
  params.includeFlows
    ? `3. For executable multi-step work, use \`run-flow\` and pass
   \`"flowsDir": "${targetPrefix}/flows"\`.
4. For one stage, call the direct tool named by the skill.
5. Write artifacts under \`runs/<run-id>/\` unless the user asks for a
   different output directory.
6. Run publish-prep or the skill's listed validation before saying a
   video is ready.`
    : `3. For executable work, call the direct tool named by the skill.
4. Write artifacts under \`runs/<run-id>/\` unless the user asks for a
   different output directory.
5. Run publish-prep or the skill's listed validation before saying a
   video is ready.`
}

## Useful Commands

\`\`\`bash
npx --no-install cm-agent list

cat <<'JSON' | npx --no-install cm-agent skill-catalog
{
  "skillsDir": "${targetPrefix}/skills",
  "includeExamples": ${params.includeExamples}
}
JSON
\`\`\`

${
  params.includeFlows
    ? `\`\`\`bash
cat <<'JSON' | npx --no-install cm-agent flow-catalog
{
  "flowsDir": "${targetPrefix}/flows"
}
JSON

cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": "${targetPrefix}/flows",
  "flow": "generate-short",
  "runId": "demo-run",
  "input": { "topic": "Example short" }
}
JSON
\`\`\`

`
    : ''
}\`\`\`bash
cat <<'JSON' | npx --no-install cm-agent doctor-report
{
  "strict": false
}
JSON
\`\`\`

## Human Prompt Pattern

When the user asks for video work, prefer this interpretation:

> Pick the right Content Machine skill${
    params.includeFlows ? ' or flow' : ''
  }, explain the lane briefly,
> run the needed JSON-stdio tools, keep artifacts inspectable, and only
> call the output ready when validation passes.

## Source-Repo Path Warning

If a copied doc mentions \`scripts/harness/\`, use it only as source-repo
context. Installed projects should execute tools with
\`npx --no-install cm-agent <tool>\` unless the user is working inside the
Content Machine checkout.
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
  if (targetHasContent && normalized.overwrite) {
    await rm(targetDir, { recursive: true, force: true });
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
    includeExamples: normalized.includeExamples,
  });
  await writePackAgentGuide({
    targetDir,
    packageName: normalized.packageName,
    includeFlows: normalized.includeFlows,
    includeExamples: normalized.includeExamples,
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
