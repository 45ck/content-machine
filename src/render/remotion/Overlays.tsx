/**
 * Overlays layer
 *
 * Renders template-provided image/video overlays with simple timing + positioning.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Img, Sequence, Video, staticFile, useVideoConfig } from 'remotion';
import type { OverlayAsset, OverlayLayer } from '../../domain';

function isRemoteSrc(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith('data:');
}

function resolveSrc(src: string): string {
  return isRemoteSrc(src) ? src : staticFile(src);
}

function computePositionStyle(params: {
  position: NonNullable<OverlayAsset['position']>;
  marginPx: number;
}): React.CSSProperties {
  const { position, marginPx } = params;
  switch (position) {
    case 'top-left':
      return { top: marginPx, left: marginPx };
    case 'top-right':
      return { top: marginPx, right: marginPx };
    case 'bottom-left':
      return { bottom: marginPx, left: marginPx };
    case 'bottom-right':
      return { bottom: marginPx, right: marginPx };
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

function inferKind(asset: OverlayAsset): NonNullable<OverlayAsset['kind']> {
  if (asset.kind) return asset.kind;
  const lower = asset.src.toLowerCase();
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mkv')
  )
    return 'video';
  return 'image';
}

const DEFAULT_MAX_OVERLAY_PX = 360;

/**
 * Renders template-provided overlays (images/videos) for a specific layer.
 */
export const Overlays: React.FC<{
  overlays?: OverlayAsset[];
  layer: OverlayLayer;
}> = ({ overlays, layer }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const filtered = useMemo(() => {
    return (overlays ?? []).filter((o) => (o.layer ?? 'below-captions') === layer);
  }, [overlays, layer]);

  if (filtered.length === 0) return null;

  return (
    <AbsoluteFill>
      {filtered.map((overlay, index) => {
        const startSeconds = overlay.start ?? 0;
        const endSeconds = overlay.end ?? durationInFrames / fps;
        const from = Math.max(0, Math.floor(startSeconds * fps));
        const to = Math.max(from + 1, Math.ceil(endSeconds * fps));
        const duration = Math.min(durationInFrames - from, Math.max(1, to - from));

        const marginPx = overlay.marginPx ?? 24;
        const position = overlay.position ?? 'top-right';
        const opacity = overlay.opacity ?? 1;
        const fit = overlay.fit ?? 'contain';
        const kind = inferKind(overlay);

        const boxStyle: React.CSSProperties = {
          position: 'absolute',
          ...computePositionStyle({ position, marginPx }),
          opacity,
          pointerEvents: 'none',
        };
        if (overlay.widthPx) boxStyle.width = overlay.widthPx;
        if (overlay.heightPx) boxStyle.height = overlay.heightPx;

        const mediaStyle: React.CSSProperties = {
          width: overlay.widthPx ? '100%' : undefined,
          height: overlay.heightPx ? '100%' : undefined,
          objectFit: fit,
          // Avoid accidentally covering the whole frame when a template supplies a large asset
          // without explicit sizing.
          ...(overlay.widthPx || overlay.heightPx
            ? null
            : { maxWidth: DEFAULT_MAX_OVERLAY_PX, maxHeight: DEFAULT_MAX_OVERLAY_PX }),
        };

        return (
          <Sequence key={`${layer}-${index}`} from={from} durationInFrames={duration}>
            <div style={boxStyle}>
              {kind === 'video' ? (
                <Video
                  src={resolveSrc(overlay.src)}
                  muted={overlay.muted ?? true}
                  style={mediaStyle}
                />
              ) : (
                <Img src={resolveSrc(overlay.src)} style={mediaStyle} />
              )}
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
