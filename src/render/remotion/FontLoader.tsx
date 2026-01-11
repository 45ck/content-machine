/**
 * Font Loader
 *
 * Loads custom font files into the Remotion render context.
 */
import React, { useEffect, useMemo } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import type { FontSource } from '../schema';

function isRemoteSource(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith('data:');
}

function resolveFontFormat(src: string): string | null {
  const ext = src.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    case 'woff2':
      return 'woff2';
    case 'woff':
      return 'woff';
    default:
      return null;
  }
}

function normalizeWeight(weight: FontSource['weight']): string | undefined {
  if (weight === undefined || weight === null) return undefined;
  return typeof weight === 'number' ? String(weight) : String(weight);
}

export const FontLoader: React.FC<{ fonts?: FontSource[] }> = ({ fonts }) => {
  const handle = useMemo(() => {
    if (!fonts || fonts.length === 0) return null;
    return delayRender('Loading custom fonts');
  }, [fonts]);

  useEffect(() => {
    if (!fonts || fonts.length === 0 || handle === null) return undefined;
    if (typeof FontFace === 'undefined' || typeof document === 'undefined') {
      continueRender(handle);
      return undefined;
    }

    let isCancelled = false;
    let didContinue = false;

    const finish = () => {
      if (didContinue || isCancelled) return;
      didContinue = true;
      continueRender(handle);
    };

    const loadFonts = async () => {
      try {
        await Promise.all(
          fonts.map(async (font) => {
            const src = isRemoteSource(font.src) ? font.src : staticFile(font.src);
            const descriptors: FontFaceDescriptors = {};
            const weight = normalizeWeight(font.weight);
            if (weight) descriptors.weight = weight;
            if (font.style) descriptors.style = font.style;
            const format = resolveFontFormat(font.src);
            const source = format ? `url(${src}) format("${format}")` : `url(${src})`;
            const face = new FontFace(font.family, source, descriptors);
            const loaded = await face.load();
            (document.fonts as unknown as { add: (font: FontFace) => void }).add(loaded);
          })
        );
      } catch (error) {
        // Don't fail the render if a custom font can't load.

        console.warn('Failed to load custom fonts', error);
      } finally {
        finish();
      }
    };

    void loadFonts();

    return () => {
      isCancelled = true;
      finish();
    };
  }, [fonts, handle]);

  return null;
};
