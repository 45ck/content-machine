import React, { useMemo } from 'react';
import { Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptionConfig } from '../captions/config';
import { SAFE_ZONES, type PlatformName } from '../tokens/safe-zone';

type WordTimestamp = { word: string; start: number; end: number };

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9#]+|[^a-z0-9#]+$/g, '')
    .trim();
}

function parseOrdinal(token: string): number | null {
  const cleaned = normalizeToken(token).replace(/[^a-z0-9]/g, '');
  if (!cleaned) return null;
  if (/^\d+$/.test(cleaned)) {
    const n = Number.parseInt(cleaned, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
  }
  const map: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
  };
  return map[cleaned] ?? null;
}

function extractListBadgeCues(words: WordTimestamp[]): Array<{ index: number; startSec: number }> {
  const cues: Array<{ index: number; startSec: number }> = [];
  const labelTokens = new Set(['number', 'headline', 'story', 'point', 'tip', '#']);

  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const next = words[i + 1];
    if (!current) continue;

    // Pattern: "1:" / "2." / "3)" (common listicle numbering in scripts)
    const rawTrim = current.word.trim();
    if (/^\d{1,2}[:.)]$/.test(rawTrim)) {
      const n = parseOrdinal(rawTrim);
      if (n != null) {
        cues.push({ index: n, startSec: current.start });
        continue;
      }
    }

    const token = normalizeToken(current.word);
    const nextToken = next ? normalizeToken(next.word) : '';

    // Pattern: "# 1" or "number one" / "headline two"
    if (labelTokens.has(token) && next) {
      const n = parseOrdinal(nextToken);
      if (n != null) {
        cues.push({ index: n, startSec: current.start });
        continue;
      }
    }

    // Pattern: "#1" / "1" (avoid triggering on every numeric mention by requiring leading '#')
    if (token.startsWith('#')) {
      const n = parseOrdinal(token);
      if (n != null) cues.push({ index: n, startSec: current.start });
    }
  }

  // Deduplicate close repeats (ASR can duplicate tokens).
  const deduped: Array<{ index: number; startSec: number }> = [];
  for (const cue of cues) {
    const last = deduped[deduped.length - 1];
    if (last && cue.index === last.index && Math.abs(cue.startSec - last.startSec) < 0.5) continue;
    deduped.push(cue);
  }

  return deduped.slice(0, 10);
}

type BadgeStyleConfig = {
  sizePx: number;
  fontSizePx: number;
  backgroundColor: string;
  borderWidthPx: number;
  borderColor: string;
  textColor: string;
  textShadow: string;
  scaleFrom: number;
  scaleTo: number;
  fadeInMs: number;
  fadeOutMs: number;
};

const Badge: React.FC<{ index: number; durationInFrames: number; config: BadgeStyleConfig }> = ({
  index,
  durationInFrames,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 320 },
    durationInFrames: Math.min(durationInFrames, 14),
  });

  const fadeInFrames = Math.max(0, Math.round((config.fadeInMs / 1000) * fps));
  const fadeOutFrames = Math.max(0, Math.round((config.fadeOutMs / 1000) * fps));
  const fadeOutStart = Math.max(0, durationInFrames - fadeOutFrames);

  const opacityIn =
    fadeInFrames > 0
      ? interpolate(frame, [0, fadeInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const opacityOut =
    fadeOutFrames > 0
      ? interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const opacity = Math.min(opacityIn, opacityOut);

  const baseScale = config.scaleFrom + (config.scaleTo - config.scaleFrom) * pop;
  const outroScale =
    fadeOutFrames > 0
      ? interpolate(frame, [fadeOutStart, durationInFrames], [1, 0.96], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const scale = baseScale * outroScale;

  return (
    <div
      style={{
        width: config.sizePx,
        height: config.sizePx,
        borderRadius: 999,
        background: config.backgroundColor,
        border: `${config.borderWidthPx}px solid ${config.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `scale(${scale})`,
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          fontSize: config.fontSizePx,
          fontWeight: 900,
          color: config.textColor,
          textShadow: config.textShadow,
        }}
      >
        #{index}
      </div>
    </div>
  );
};

function resolveSafeZoneInsets(
  config: Partial<CaptionConfig> | undefined,
  width: number,
  height: number
): { top: number; bottom: number; left: number; right: number } {
  if (!config?.safeZone?.enabled) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const platform = ((config.safeZone.platform ?? 'universal') as PlatformName) ?? 'universal';
  const zone = SAFE_ZONES[platform] ?? SAFE_ZONES.universal;
  const scaleX = width / 1080;
  const scaleY = height / 1920;

  return {
    top: zone.top * scaleY,
    bottom: zone.bottom * scaleY,
    left: zone.left * scaleX,
    right: zone.right * scaleX,
  };
}

function estimateCaptionBlockHeightPx(config: Partial<CaptionConfig> | undefined): number {
  const fontSize = config?.fontSize ?? 72;
  const lineHeight = config?.lineHeight ?? 1.25;
  const maxLines = config?.layout?.maxLinesPerPage ?? 2;
  const pillPaddingY = config?.pillStyle?.paddingY ?? 6;
  return Math.max(120, fontSize * lineHeight * maxLines + pillPaddingY * 2 + 30);
}

function computeBadgeAnchor(
  captionConfig: Partial<CaptionConfig> | undefined,
  width: number,
  height: number
): { anchorStyle: React.CSSProperties; centered: boolean } {
  if (!captionConfig) {
    return { anchorStyle: { top: 70, left: 60 }, centered: false };
  }

  const safeZone = resolveSafeZoneInsets(captionConfig, width, height);
  const edgeDistance = captionConfig.positionOffset?.edgeDistance ?? 15;
  const edgePx = (edgeDistance / 100) * height;
  const badgeCfg = captionConfig.listBadges;
  // Extra padding so badges never feel like they're "in" the caption band.
  // This also protects against multi-line chunks + pill/stroke/shadow inflating true height.
  const captionSafetyPx = badgeCfg?.captionSafetyPx ?? 80;
  const captionHeight = estimateCaptionBlockHeightPx(captionConfig) + captionSafetyPx;
  const badgeGapPx = badgeCfg?.gapPx ?? 110;
  const badgeSizePx = badgeCfg?.sizePx ?? 110;

  const position = captionConfig.position ?? 'bottom';
  if (position === 'top') {
    const topOffset = Math.max(edgePx, safeZone.top);
    const top = topOffset + captionHeight + badgeGapPx;
    return {
      anchorStyle: { left: '50%', top: Math.min(height - badgeSizePx - 20, top), zIndex: 50 },
      centered: true,
    };
  }

  if (position === 'center') {
    const topOffset = Math.max(edgePx, safeZone.top);
    const top = topOffset + 80;
    return {
      anchorStyle: { left: '50%', top: Math.min(height - badgeSizePx - 20, top), zIndex: 50 },
      centered: true,
    };
  }

  // Default: bottom captions -> keep badges ABOVE the caption block.
  const bottomOffset = Math.max(edgePx, safeZone.bottom);
  const top = height - (bottomOffset + captionHeight + badgeGapPx + badgeSizePx);

  return {
    anchorStyle: {
      left: '50%',
      top: Math.max(20, Math.min(height - badgeSizePx - 20, top)),
      zIndex: 50,
    },
    centered: true,
  };
}

export const ListBadges: React.FC<{
  words: WordTimestamp[];
  enabled?: boolean;
  timingOffsetMs?: number;
  captionConfig?: Partial<CaptionConfig>;
}> = ({ words, enabled = true, timingOffsetMs = 0, captionConfig }) => {
  const { fps, width, height } = useVideoConfig();
  const cues = useMemo(() => extractListBadgeCues(words), [words]);
  if (!enabled || cues.length === 0) return null;

  const badgeCfg = captionConfig?.listBadges;
  const durationMs = badgeCfg?.durationMs ?? 1200;
  const durationInFrames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const offsetSeconds = timingOffsetMs / 1000;
  const { anchorStyle, centered } = useMemo(
    () => computeBadgeAnchor(captionConfig, width, height),
    [captionConfig, width, height]
  );

  const badgeStyleConfig: BadgeStyleConfig = {
    sizePx: badgeCfg?.sizePx ?? 110,
    fontSizePx: badgeCfg?.fontSizePx ?? 54,
    backgroundColor: badgeCfg?.backgroundColor ?? 'rgba(0,0,0,0.65)',
    borderWidthPx: badgeCfg?.borderWidthPx ?? 4,
    borderColor: badgeCfg?.borderColor ?? 'rgba(255,255,255,0.85)',
    textColor: badgeCfg?.textColor ?? '#FFFFFF',
    textShadow: badgeCfg?.textShadow ?? '0 6px 16px rgba(0,0,0,0.6)',
    scaleFrom: badgeCfg?.scaleFrom ?? 0.75,
    scaleTo: badgeCfg?.scaleTo ?? 1,
    fadeInMs: badgeCfg?.fadeInMs ?? 160,
    fadeOutMs: badgeCfg?.fadeOutMs ?? 220,
  };

  return (
    <>
      {cues.map((cue, idx) => {
        const from = Math.max(0, Math.floor((cue.startSec + offsetSeconds) * fps));
        return (
          <Sequence
            key={`${cue.index}-${idx}-${from}`}
            from={from}
            durationInFrames={durationInFrames}
            layout="none"
          >
            <div
              style={{
                position: 'absolute',
                ...(anchorStyle ?? {}),
                transform: centered ? 'translateX(-50%)' : undefined,
              }}
            >
              <Badge
                index={cue.index}
                durationInFrames={durationInFrames}
                config={badgeStyleConfig}
              />
            </div>
          </Sequence>
        );
      })}
    </>
  );
};
