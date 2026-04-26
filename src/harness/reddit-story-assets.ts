import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const ThemeEnum = z.enum(['reddit-dark']);
const CardKindEnum = z.enum(['post', 'comment', 'update', 'verdict']);

const CardSchema = z.object({
  id: z.string().min(1),
  kind: CardKindEnum.default('comment'),
  label: z.string().min(1).optional(),
  subreddit: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  age: z.string().min(1).optional(),
  score: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  footer: z.string().min(1).optional(),
  awards: z.array(z.string().min(1)).max(5).optional(),
});

export const RedditStoryAssetsRequestSchema = z
  .object({
    outputDir: z.string().min(1),
    theme: ThemeEnum.default('reddit-dark'),
    width: z.number().int().positive().default(1080),
    height: z.number().int().positive().default(864),
    subreddit: z.string().min(1).default('AmItheAsshole'),
    author: z.string().min(1).default('throwra_storytime'),
    age: z.string().min(1).default('7 hr. ago'),
    title: z.string().min(1),
    upvotes: z.string().min(1).default('18.4k'),
    commentCount: z.string().min(1).default('2.1k'),
    awards: z.array(z.string().min(1)).max(5).default([]),
    cards: z.array(CardSchema).min(1),
  })
  .strict();

type RedditStoryAssetsRequest = z.input<typeof RedditStoryAssetsRequestSchema>;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function renderMultilineText(params: {
  text: string;
  x: number;
  y: number;
  maxChars: number;
  lineHeight: number;
  fontSize: number;
  fill: string;
  fontWeight?: number | string;
  opacity?: number;
}): string {
  const lines = wrapText(params.text, params.maxChars);
  return [
    `<text x="${params.x}" y="${params.y}" font-family="Inter, Arial, sans-serif" font-size="${params.fontSize}" font-weight="${params.fontWeight ?? 600}" fill="${params.fill}"${params.opacity ? ` opacity="${params.opacity}"` : ''}>`,
    ...lines.map((line, index) => {
      const dy = index === 0 ? 0 : params.lineHeight;
      return `<tspan x="${params.x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    }),
    `</text>`,
  ].join('');
}

function renderBadge(label: string, x: number, y: number, fill: string, textFill: string): string {
  const width = Math.max(116, Math.min(320, 28 + label.length * 12));
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="46" rx="23" fill="${fill}" />`,
    `<text x="${x + 24}" y="${y + 31}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="${textFill}">${escapeXml(label.toUpperCase())}</text>`,
  ].join('');
}

function renderAwardChip(label: string, x: number, y: number): string {
  const width = Math.max(118, Math.min(240, 30 + label.length * 12));
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="42" rx="21" fill="#22282C" stroke="#3A4147" stroke-width="1.5" />`,
    `<text x="${x + 18}" y="${y + 28}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#FFD166">${escapeXml(
      label
    )}</text>`,
  ].join('');
}

function redditPalette(kind: z.infer<typeof CardKindEnum>) {
  switch (kind) {
    case 'post':
      return { badgeFill: '#FF4500', badgeText: '#FFFFFF' };
    case 'update':
      return { badgeFill: '#2D6CDF', badgeText: '#FFFFFF' };
    case 'verdict':
      return { badgeFill: '#14AE5C', badgeText: '#08140D' };
    default:
      return { badgeFill: '#2A3236', badgeText: '#D7DADC' };
  }
}

function renderCardSvg(
  request: z.output<typeof RedditStoryAssetsRequestSchema>,
  card: z.output<typeof CardSchema>
): string {
  const { width, height } = request;
  const outerPad = 44;
  const cardX = 52;
  const cardY = 58;
  const cardWidth = width - cardX * 2;
  const cardHeight = height - 120;
  const headerSubreddit = card.subreddit ?? request.subreddit;
  const headerAuthor = card.author ?? request.author;
  const headerAge = card.age ?? request.age;
  const headerScore = card.score ?? request.upvotes;
  const awards = card.awards ?? (card.kind === 'post' ? request.awards : []);
  const palette = redditPalette(card.kind);
  const title = card.title ?? (card.kind === 'post' ? request.title : '');
  const hasTitle = title.trim().length > 0;
  const titleLines = hasTitle ? wrapText(title, 34) : [];
  const bodyMaxChars = hasTitle ? 46 : 34;
  const bodyLines = wrapText(card.body, bodyMaxChars);
  const footer = card.footer ?? `${request.commentCount} comments`;

  const titleStartY = 232;
  const awardsY = hasTitle ? 346 : 232;
  const bodyStartY = hasTitle ? 364 : 320;
  const bodyLineHeight = hasTitle ? 44 : 56;
  const bodyFontSize = hasTitle ? 32 : 42;
  const bodyWeight = hasTitle ? 600 : 800;
  const awardMarkup = awards
    .slice(0, 3)
    .map((award, index) => renderAwardChip(award, 96 + index * 172, awardsY))
    .join('');
  const effectiveBodyStartY = awards.length > 0 && hasTitle ? bodyStartY + 64 : bodyStartY;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101317"/>
      <stop offset="100%" stop-color="#181B20"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6A3D" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FF4500" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="${outerPad}" y="${outerPad}" width="${width - outerPad * 2}" height="${
    height - outerPad * 2
  }" rx="34" fill="url(#glow)" opacity="0.7"/>
  <g filter="url(#shadow)">
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="34" fill="#1A1A1B" stroke="#343536" stroke-width="2"/>
  </g>
  <circle cx="122" cy="126" r="28" fill="#FF4500"/>
  <text x="122" y="136" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">r</text>
  <text x="164" y="116" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#FFFFFF">r/${escapeXml(
    headerSubreddit
  )}</text>
  <text x="164" y="152" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" fill="#818384">u/${escapeXml(
    headerAuthor
  )} • ${escapeXml(headerAge)}</text>
  ${card.label ? renderBadge(card.label, 790, 96, palette.badgeFill, palette.badgeText) : ''}
  ${
    hasTitle
      ? renderMultilineText({
          text: titleLines.join(' '),
          x: 96,
          y: titleStartY,
          maxChars: 34,
          lineHeight: 62,
          fontSize: 48,
          fontWeight: 800,
          fill: '#F2F4F5',
        })
      : ''
  }
  ${awardMarkup}
  ${renderMultilineText({
    text: bodyLines.join(' '),
    x: 96,
    y: effectiveBodyStartY,
    maxChars: bodyMaxChars,
    lineHeight: bodyLineHeight,
    fontSize: bodyFontSize,
    fontWeight: bodyWeight,
    fill: '#D7DADC',
  })}
  <line x1="96" y1="${cardHeight + 18}" x2="${cardWidth - 96}" y2="${cardHeight + 18}" stroke="#2A3236" stroke-width="2"/>
  <polygon points="102,${cardHeight + 76} 126,${cardHeight + 40} 150,${cardHeight + 76}" fill="#FF4500"/>
  <polygon points="102,${cardHeight + 122} 126,${cardHeight + 158} 150,${cardHeight + 122}" fill="#818384"/>
  <text x="176" y="${cardHeight + 104}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#FFFFFF">${escapeXml(
    headerScore
  )}</text>
  <text x="324" y="${cardHeight + 104}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#818384">${escapeXml(
    footer
  )}</text>
  <text x="820" y="${cardHeight + 104}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#818384">Share</text>
</svg>`;
}

export async function runRedditStoryAssets(
  request: RedditStoryAssetsRequest
): Promise<
  HarnessToolResult<{
    outputDir: string;
    assets: Array<{ id: string; path: string; kind: z.infer<typeof CardKindEnum> }>;
    manifestPath: string;
  }>
> {
  const normalized = RedditStoryAssetsRequestSchema.parse(request);
  const outputDir = resolve(normalized.outputDir);
  await mkdir(outputDir, { recursive: true });

  const assets: Array<{ id: string; path: string; kind: z.infer<typeof CardKindEnum> }> = [];
  for (const card of normalized.cards) {
    const svg = renderCardSvg(normalized, card);
    const path = join(outputDir, `${card.id}.svg`);
    await writeFile(path, svg, 'utf8');
    assets.push({ id: card.id, path, kind: card.kind });
  }

  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ theme: normalized.theme, assets }, null, 2), 'utf8');

  return {
    result: {
      outputDir,
      assets,
      manifestPath,
    },
    artifacts: [
      artifactFile(manifestPath, 'Generated Reddit-story asset manifest'),
      ...assets.map((asset) => artifactFile(asset.path, `Generated Reddit-story ${asset.kind} card`)),
    ],
  };
}
