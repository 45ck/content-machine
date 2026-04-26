import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const ThemeEnum = z.enum(['reddit-light', 'reddit-dark']);
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
    theme: ThemeEnum.default('reddit-light'),
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

type RedditTheme = z.infer<typeof ThemeEnum>;
type RedditCardKind = z.infer<typeof CardKindEnum>;

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

function clampTextLines(text: string, maxChars: number, maxLines: number): string[] {
  const lines = wrapText(text, maxChars).filter((line) => line.length > 0);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1] ?? '';
  kept[maxLines - 1] = `${last
    .replace(/[.?!,:;]+$/u, '')
    .slice(0, Math.max(0, maxChars - 2))
    .trimEnd()}…`;
  return kept;
}

function renderMultilineText(params: {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  fontSize: number;
  fill: string;
  fontWeight?: number | string;
  opacity?: number;
  fontFamily?: string;
}): string {
  const lines = params.lines;
  return [
    `<text x="${params.x}" y="${params.y}" font-family="${params.fontFamily ?? 'Arial, Helvetica, sans-serif'}" font-size="${params.fontSize}" font-weight="${params.fontWeight ?? 600}" fill="${params.fill}"${params.opacity ? ` opacity="${params.opacity}"` : ''}>`,
    ...lines.map((line, index) => {
      const dy = index === 0 ? 0 : params.lineHeight;
      return `<tspan x="${params.x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    }),
    `</text>`,
  ].join('');
}

function measurePillWidth(
  label: string,
  minWidth: number,
  maxWidth: number,
  charWidth: number
): number {
  return Math.max(minWidth, Math.min(maxWidth, 28 + label.length * charWidth));
}

function renderBadge(label: string, x: number, y: number, fill: string, textFill: string): string {
  const width = measurePillWidth(label, 108, 280, 11);
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="46" rx="23" fill="${fill}" />`,
    `<text x="${x + 22}" y="${y + 31}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="800" fill="${textFill}">${escapeXml(label.toUpperCase())}</text>`,
  ].join('');
}

function awardGlyph(label: string): { glyph: string; fill: string; textFill: string } {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('gold')) return { glyph: '★', fill: '#FFD54A', textFill: '#4A3500' };
  if (normalized.includes('silver')) return { glyph: '✦', fill: '#D3D7DE', textFill: '#344150' };
  if (normalized.includes('help')) return { glyph: '✚', fill: '#82D4FF', textFill: '#0A3753' };
  if (normalized.includes('whole')) return { glyph: '♥', fill: '#FFB86C', textFill: '#5A2C00' };
  return { glyph: '✦', fill: '#E6ECF3', textFill: '#2C3642' };
}

function renderAwardChip(label: string, x: number, y: number, theme: RedditTheme): string {
  const width = measurePillWidth(label, 104, 220, 10);
  const glyph = awardGlyph(label);
  const textColor = theme === 'reddit-light' ? '#66717D' : '#B5BDC7';
  const pillFill = theme === 'reddit-light' ? '#F5F7FA' : '#20252B';
  const pillStroke = theme === 'reddit-light' ? '#E2E7EE' : '#313842';
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="36" rx="18" fill="${pillFill}" stroke="${pillStroke}" stroke-width="1.25" />`,
    `<circle cx="${x + 18}" cy="${y + 18}" r="12" fill="${glyph.fill}" />`,
    `<text x="${x + 18}" y="${y + 23}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="900" fill="${glyph.textFill}">${glyph.glyph}</text>`,
    `<text x="${x + 36}" y="${y + 24}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="${textColor}">${escapeXml(
      label
    )}</text>`,
  ].join('');
}

function redditPalette(theme: RedditTheme, kind: RedditCardKind) {
  const kindAccent =
    kind === 'post'
      ? '#FF4500'
      : kind === 'update'
        ? '#1D7CF2'
        : kind === 'verdict'
          ? '#16A34A'
          : '#8892A0';
  if (theme === 'reddit-light') {
    return {
      canvas: '#EEF2F5',
      shell: '#FFFFFF',
      shellStroke: '#DFE5EB',
      railFill: '#F5F7FA',
      divider: '#E6EBF1',
      textPrimary: '#1F2933',
      textSecondary: '#6B7280',
      textMuted: '#8792A2',
      badgeFill: kindAccent,
      badgeText: '#FFFFFF',
      footerText: '#66717D',
      scoreText: '#1F2933',
      accent: '#FF4500',
      topBar: '#F8FAFC',
      outerShadow: '#8A99AB',
    };
  }
  return {
    canvas: '#0E1113',
    shell: '#1A1C1F',
    shellStroke: '#2E343C',
    railFill: '#15181B',
    divider: '#2D333A',
    textPrimary: '#F5F7FA',
    textSecondary: '#B3BBC6',
    textMuted: '#8D96A1',
    badgeFill: kindAccent,
    badgeText: '#FFFFFF',
    footerText: '#B3BBC6',
    scoreText: '#F5F7FA',
    accent: '#FF4500',
    topBar: '#171A1D',
    outerShadow: '#000000',
  };
}

function renderVoteRail(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  score: string;
  palette: ReturnType<typeof redditPalette>;
}): string {
  const centerX = params.x + params.width / 2;
  const topY = params.y + 54;
  const downY = params.y + 136;
  return [
    `<rect x="${params.x}" y="${params.y}" width="${params.width}" height="${params.height}" rx="24" fill="${params.palette.railFill}" />`,
    `<polygon points="${centerX},${topY - 22} ${centerX - 20},${topY + 10} ${centerX + 20},${topY + 10}" fill="${params.palette.accent}" />`,
    `<text x="${centerX}" y="${params.y + 104}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="${params.palette.scoreText}">${escapeXml(
      params.score
    )}</text>`,
    `<polygon points="${centerX},${downY + 22} ${centerX - 20},${downY - 10} ${centerX + 20},${downY - 10}" fill="${params.palette.textMuted}" />`,
  ].join('');
}

function renderFooter(params: {
  x: number;
  y: number;
  width: number;
  footer: string;
  palette: ReturnType<typeof redditPalette>;
}): string {
  const commentsX = params.x + 116;
  const shareX = params.x + params.width - 210;
  const moreX = params.x + params.width - 86;
  return [
    `<line x1="${params.x}" y1="${params.y - 26}" x2="${params.x + params.width}" y2="${params.y - 26}" stroke="${params.palette.divider}" stroke-width="1.5" />`,
    `<rect x="${params.x}" y="${params.y - 4}" width="28" height="22" rx="6" fill="none" stroke="${params.palette.footerText}" stroke-width="3" />`,
    `<path d="M ${params.x + 20} ${params.y + 18} l -10 10 l 2 -10" fill="none" stroke="${params.palette.footerText}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`,
    `<text x="${commentsX}" y="${params.y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${params.palette.footerText}">${escapeXml(
      params.footer
    )}</text>`,
    `<path d="M ${shareX} ${params.y + 10} q 18 -24 42 -24" fill="none" stroke="${params.palette.footerText}" stroke-width="4" stroke-linecap="round" />`,
    `<path d="M ${shareX + 42} ${params.y - 14} l 18 18 l -20 10" fill="none" stroke="${params.palette.footerText}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`,
    `<text x="${shareX + 76}" y="${params.y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${params.palette.footerText}">Share</text>`,
    `<circle cx="${moreX}" cy="${params.y + 2}" r="5" fill="${params.palette.footerText}" />`,
    `<circle cx="${moreX + 20}" cy="${params.y + 2}" r="5" fill="${params.palette.footerText}" />`,
    `<circle cx="${moreX + 40}" cy="${params.y + 2}" r="5" fill="${params.palette.footerText}" />`,
  ].join('');
}

function renderCardSvg(
  request: z.output<typeof RedditStoryAssetsRequestSchema>,
  card: z.output<typeof CardSchema>
): string {
  const { width, height } = request;
  const palette = redditPalette(request.theme, card.kind);
  const framePad = 36;
  const screenshotX = 42;
  const screenshotY = 52;
  const screenshotWidth = width - screenshotX * 2;
  const screenshotHeight = height - 92;
  const topBarHeight = 54;
  const cardX = screenshotX + 22;
  const cardY = screenshotY + topBarHeight + 18;
  const cardWidth = screenshotWidth - 44;
  const cardHeight = screenshotHeight - topBarHeight - 40;
  const railWidth = 88;
  const contentX = cardX + railWidth + 32;
  const contentWidth = cardWidth - railWidth - 64;
  const headerSubreddit = card.subreddit ?? request.subreddit;
  const headerAuthor = card.author ?? request.author;
  const headerAge = card.age ?? request.age;
  const headerScore = card.score ?? request.upvotes;
  const awards = card.awards ?? (card.kind === 'post' ? request.awards : []);
  const title = card.title ?? (card.kind === 'post' ? request.title : '');
  const hasTitle = title.trim().length > 0;
  const titleLines = hasTitle ? clampTextLines(title, 34, card.kind === 'post' ? 2 : 1) : [];
  const bodyMaxChars = request.theme === 'reddit-light' ? 44 : 42;
  const bodyLines = clampTextLines(card.body, bodyMaxChars, hasTitle ? 4 : 5);
  const footer = card.footer ?? `${request.commentCount} comments`;
  const headerY = cardY + 84;
  const titleStartY = cardY + 164;
  const awardRowY = titleStartY + (hasTitle ? titleLines.length * 56 + 20 : 0);
  const bodyStartY = hasTitle ? awardRowY + (awards.length > 0 ? 58 : 20) : cardY + 178;
  const bodyLineHeight = 42;
  const bodyFontSize = hasTitle ? 30 : 34;
  const bodyWeight = hasTitle ? 600 : 700;
  const awardMarkup = awards
    .slice(0, 3)
    .map((award, index) => renderAwardChip(award, contentX + index * 148, awardRowY, request.theme))
    .join('');
  const labelMarkup = card.label
    ? renderBadge(
        card.label,
        cardX + cardWidth - measurePillWidth(card.label.toUpperCase(), 108, 280, 11) - 28,
        cardY + 30,
        palette.badgeFill,
        palette.badgeText
      )
    : '';
  const bodyClipHeight = cardY + cardHeight - 116 - bodyStartY;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="26" flood-color="${palette.outerShadow}" flood-opacity="${
        request.theme === 'reddit-light' ? '0.18' : '0.35'
      }"/>
    </filter>
    <clipPath id="body-clip">
      <rect x="${contentX}" y="${bodyStartY - 30}" width="${contentWidth}" height="${Math.max(0, bodyClipHeight)}" rx="0" />
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="${palette.canvas}"/>
  <rect x="${framePad}" y="${framePad}" width="${width - framePad * 2}" height="${
    height - framePad * 2
  }" rx="30" fill="${request.theme === 'reddit-light' ? '#FFFFFF' : '#121518'}" opacity="${
    request.theme === 'reddit-light' ? '0.42' : '0.3'
  }"/>
  <g filter="url(#shadow)">
    <rect x="${screenshotX}" y="${screenshotY}" width="${screenshotWidth}" height="${screenshotHeight}" rx="30" fill="${palette.shell}" stroke="${palette.shellStroke}" stroke-width="1.5"/>
  </g>
  <rect x="${screenshotX}" y="${screenshotY}" width="${screenshotWidth}" height="${topBarHeight}" rx="30" fill="${palette.topBar}" />
  <rect x="${screenshotX}" y="${screenshotY + topBarHeight - 20}" width="${screenshotWidth}" height="20" fill="${palette.topBar}" />
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="26" fill="${palette.shell}" stroke="${palette.divider}" stroke-width="1.25"/>
  ${renderVoteRail({
    x: cardX + 14,
    y: cardY + 18,
    width: railWidth,
    height: cardHeight - 36,
    score: headerScore,
    palette,
  })}
  <circle cx="${contentX + 18}" cy="${headerY - 12}" r="18" fill="${palette.accent}"/>
  <text x="${contentX + 18}" y="${headerY - 5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF">r</text>
  <text x="${contentX + 48}" y="${headerY - 12}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="${palette.textPrimary}">r/${escapeXml(
    headerSubreddit
  )}</text>
  <text x="${contentX + 48}" y="${headerY + 18}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600" fill="${palette.textSecondary}">Posted by u/${escapeXml(
    headerAuthor
  )} • ${escapeXml(headerAge)}</text>
  ${labelMarkup}
  ${
    hasTitle
      ? renderMultilineText({
          lines: titleLines,
          x: contentX,
          y: titleStartY,
          lineHeight: 54,
          fontSize: 44,
          fontWeight: 800,
          fill: palette.textPrimary,
        })
      : ''
  }
  ${awardMarkup}
  <g clip-path="url(#body-clip)">
    ${renderMultilineText({
      lines: bodyLines,
      x: contentX,
      y: bodyStartY,
      lineHeight: bodyLineHeight,
      fontSize: bodyFontSize,
      fontWeight: bodyWeight,
      fill: palette.textSecondary,
    })}
  </g>
  ${renderFooter({
    x: contentX,
    y: cardY + cardHeight - 54,
    width: contentWidth,
    footer,
    palette,
  })}
</svg>`;
}

export async function runRedditStoryAssets(request: RedditStoryAssetsRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    assets: Array<{
      id: string;
      path: string;
      svgPath: string;
      kind: z.infer<typeof CardKindEnum>;
    }>;
    manifestPath: string;
  }>
> {
  const normalized = RedditStoryAssetsRequestSchema.parse(request);
  const outputDir = resolve(normalized.outputDir);
  await mkdir(outputDir, { recursive: true });

  const assets: Array<{
    id: string;
    path: string;
    svgPath: string;
    kind: z.infer<typeof CardKindEnum>;
  }> = [];
  for (const card of normalized.cards) {
    const svg = renderCardSvg(normalized, card);
    const svgPath = join(outputDir, `${card.id}.svg`);
    const pngPath = join(outputDir, `${card.id}.png`);
    await writeFile(svgPath, svg, 'utf8');
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    assets.push({ id: card.id, path: pngPath, svgPath, kind: card.kind });
  }

  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify({ theme: normalized.theme, assets }, null, 2),
    'utf8'
  );

  return {
    result: {
      outputDir,
      assets,
      manifestPath,
    },
    artifacts: [
      artifactFile(manifestPath, 'Generated Reddit-story asset manifest'),
      ...assets.flatMap((asset) => [
        artifactFile(asset.path, `Generated Reddit-story ${asset.kind} card PNG`),
        artifactFile(asset.svgPath, `Generated Reddit-story ${asset.kind} card SVG`),
      ]),
    ],
  };
}
