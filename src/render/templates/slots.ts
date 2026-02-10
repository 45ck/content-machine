/**
 * Template asset slot + params helpers.
 */
import { extname, resolve } from 'path';
import type { RenderTemplate } from '../../domain/render-templates';
import type { FontSource } from '../../domain';
import { SchemaError } from '../../core/errors';

export interface GameplayAssetSlot {
  /**
   * Ubiquitous Language: Template slot (gameplay library id).
   *
   * Used to select a gameplay "library" namespace for split-screen templates.
   */
  library?: string;
  /**
   * Ubiquitous Language: Template slot (gameplay style id).
   *
   * Used to select a gameplay style folder within a library (e.g. "subway-surfers").
   */
  style?: string;
  /**
   * Ubiquitous Language: Template slot (explicit gameplay clip).
   *
   * Used to pin a specific clip within a gameplay library/style.
   */
  clip?: string;
  /**
   * Ubiquitous Language: Template slot required flag.
   *
   * When true, preflight fails if the slot cannot be satisfied.
   */
  required?: boolean;
}

/**
 * Ubiquitous Language: Template-owned font asset.
 *
 * Fonts declared by a template pack under `assets.fonts` and merged into render props.
 */
export interface TemplateFontAsset extends FontSource {}

export type OverlayLayer = 'below-captions' | 'above-captions';
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type OverlayKind = 'image' | 'video';

export interface TemplateOverlayAsset {
  src: string;
  kind?: OverlayKind;
  layer?: OverlayLayer;
  position?: OverlayPosition;
  start?: number; // seconds
  end?: number; // seconds
  opacity?: number; // 0..1
  marginPx?: number;
  widthPx?: number;
  heightPx?: number;
  fit?: 'contain' | 'cover';
  muted?: boolean;
}

/**
 * Ubiquitous Language: Template params.
 *
 * Composition-specific knobs declared under `template.json` -> `params`.
 */
export interface TemplateParams {
  splitScreenRatio?: number;
  gameplayPosition?: 'top' | 'bottom' | 'full';
  contentPosition?: 'top' | 'bottom' | 'full';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function isRemoteSource(src: string): boolean {
  return /^https?:\/\//i.test(src) || src.startsWith('data:');
}

function isSupportedFontPath(src: string): boolean {
  const ext = extname(src).toLowerCase();
  return ext === '.ttf' || ext === '.otf' || ext === '.woff' || ext === '.woff2';
}

function isSupportedOverlayPath(src: string): boolean {
  const ext = extname(src).toLowerCase();
  if (!ext) return false;
  // Images
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif')
    return true;
  // Video
  if (ext === '.mp4' || ext === '.mov' || ext === '.webm' || ext === '.mkv') return true;
  return false;
}

function isAbsoluteLike(path: string): boolean {
  return (
    path.startsWith('/') ||
    // Windows absolute paths can start with a backslash (UNC paths or rooted paths).
    path.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/.test(path) ||
    path === '~' ||
    path.startsWith('~/') ||
    path.startsWith('~\\')
  );
}

/**
 * Extract gameplay slot defaults from a template (if provided).
 */
export function getTemplateGameplaySlot(template?: RenderTemplate): GameplayAssetSlot | null {
  const assets = asRecord(template?.assets);
  if (!assets) return null;
  const gameplay = asRecord(assets.gameplay);
  if (!gameplay) return null;

  const slot: GameplayAssetSlot = {};
  if (typeof gameplay.library === 'string') slot.library = gameplay.library;
  if (typeof gameplay.style === 'string') slot.style = gameplay.style;
  if (typeof gameplay.clip === 'string') slot.clip = gameplay.clip;
  if (typeof gameplay.required === 'boolean') slot.required = gameplay.required;

  return Object.keys(slot).length > 0 ? slot : null;
}

/**
 * Extract custom fonts declared by a template.
 *
 * Expected shape in template.json:
 *
 * - assets.fonts: Array<{ family: string; src: string; weight?: string|number; style?: 'normal'|'italic'|'oblique' }>
 *
 * Paths are resolved relative to `templateDir` when local.
 */
export function getTemplateFontSources(
  template: RenderTemplate | undefined,
  templateDir?: string
): FontSource[] {
  const assets = asRecord(template?.assets);
  if (!assets) return [];
  const rawFonts = assets.fonts;
  if (!Array.isArray(rawFonts) || rawFonts.length === 0) return [];

  if (!templateDir) {
    throw new SchemaError('Template assets.fonts requires a known templateDir', {
      templateId: template?.id,
      fix: 'Load the template from a file/dir, or install it so CM can resolve its directory',
    });
  }

  const fonts: FontSource[] = [];
  for (const entry of rawFonts) {
    if (!entry || typeof entry !== 'object') {
      throw new SchemaError('Invalid template assets.fonts entry', {
        templateId: template?.id,
        received: entry,
        fix: 'Use assets.fonts: [{ "family": "...", "src": "assets/fonts/MyFont.ttf" }]',
      });
    }
    const rec = entry as Record<string, unknown>;
    const family = typeof rec.family === 'string' ? rec.family.trim() : '';
    const src = typeof rec.src === 'string' ? rec.src.trim() : '';
    if (!family || !src) {
      throw new SchemaError('Invalid template font asset: missing family/src', {
        templateId: template?.id,
        received: rec,
        fix: 'Each assets.fonts[] entry must include { family, src }',
      });
    }
    if (!isRemoteSource(src) && !isSupportedFontPath(src)) {
      throw new SchemaError('Invalid template font src: unsupported file extension', {
        templateId: template?.id,
        received: src,
        fix: 'Use a .ttf, .otf, .woff, or .woff2 font path in assets.fonts[].src',
      });
    }

    let resolvedSrc = src;
    if (!isRemoteSource(src)) {
      if (isAbsoluteLike(src)) {
        throw new SchemaError('Invalid template font src: absolute paths are not allowed', {
          templateId: template?.id,
          received: src,
          fix: 'Use a relative path inside the template pack, e.g. "assets/fonts/MyFont.ttf"',
        });
      }
      const normalized = src.replace(/\\/g, '/');
      if (normalized.includes('..')) {
        throw new SchemaError('Invalid template font src: path traversal not allowed', {
          templateId: template?.id,
          received: src,
          fix: 'Remove any ".." segments from assets.fonts[].src',
        });
      }
      resolvedSrc = resolve(templateDir, src);
    }

    const weight = rec.weight as FontSource['weight'];
    const style = rec.style as FontSource['style'];
    fonts.push({
      family,
      src: resolvedSrc,
      ...(weight !== undefined ? { weight } : {}),
      ...(style !== undefined ? { style } : {}),
    });
  }

  return fonts;
}

function normalizeOverlayEntry(
  raw: unknown,
  templateId: string | undefined
): TemplateOverlayAsset {
  if (typeof raw === 'string') return { src: raw };
  if (!raw || typeof raw !== 'object') {
    throw new SchemaError('Invalid template assets.overlays entry', {
      templateId,
      received: raw,
      fix: 'Use assets.overlays: ["assets/overlays/logo.png"] or objects like { src, position, start }',
    });
  }

  const rec = raw as Record<string, unknown>;
  const src = requireOverlaySrc(rec, templateId);

  const kind = parseOverlayEnum(rec, templateId, 'kind', OVERLAY_KINDS, {
    message: 'Invalid template overlay kind',
    fix: 'Use kind: "image" or "video"',
  });
  const layer = parseOverlayEnum(rec, templateId, 'layer', OVERLAY_LAYERS, {
    message: 'Invalid template overlay layer',
    fix: 'Use layer: "below-captions" or "above-captions"',
  });
  const position = parseOverlayEnum(rec, templateId, 'position', OVERLAY_POSITIONS, {
    message: 'Invalid template overlay position',
    fix: 'Use position: top-left, top-right, bottom-left, bottom-right, or center',
  });
  const fit = parseOverlayEnum(rec, templateId, 'fit', OVERLAY_FITS, {
    message: 'Invalid template overlay fit',
    fix: 'Use fit: contain or cover',
  });

  const { start, end } = parseOverlayTiming(rec, templateId);
  const opacity = parseOverlayOpacity(rec, templateId);
  const { marginPx, widthPx, heightPx } = parseOverlayPxFields(rec, templateId);
  const muted = rec.muted !== undefined ? Boolean(rec.muted) : undefined;

  const out: TemplateOverlayAsset = { src };
  if (kind) out.kind = kind;
  if (layer) out.layer = layer;
  if (position) out.position = position;
  if (start !== undefined) out.start = start;
  if (end !== undefined) out.end = end;
  if (opacity !== undefined) out.opacity = opacity;
  if (marginPx !== undefined) out.marginPx = marginPx;
  if (widthPx !== undefined) out.widthPx = widthPx;
  if (heightPx !== undefined) out.heightPx = heightPx;
  if (fit) out.fit = fit;
  if (muted !== undefined) out.muted = muted;
  return out;
}

const OVERLAY_KINDS = new Set<OverlayKind>(['image', 'video']);
const OVERLAY_LAYERS = new Set<OverlayLayer>(['below-captions', 'above-captions']);
const OVERLAY_POSITIONS = new Set<OverlayPosition>([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]);
const OVERLAY_FITS = new Set<'contain' | 'cover'>(['contain', 'cover']);

function requireOverlaySrc(rec: Record<string, unknown>, templateId: string | undefined): string {
  const src = typeof rec.src === 'string' ? rec.src.trim() : '';
  if (!src) {
    throw new SchemaError('Invalid template overlay: missing src', {
      templateId,
      received: rec,
      fix: 'Each assets.overlays[] entry must include { src } (or be a string path)',
    });
  }
  return src;
}

function parseOverlayEnum<T extends string>(
  rec: Record<string, unknown>,
  templateId: string | undefined,
  key: string,
  allowed: Set<T>,
  error: { message: string; fix: string }
): T | undefined {
  const raw = rec[key];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    throw new SchemaError(error.message, { templateId, received: raw, fix: error.fix });
  }
  const value = raw as T;
  if (!allowed.has(value)) {
    throw new SchemaError(error.message, { templateId, received: value, fix: error.fix });
  }
  return value;
}

function parseOverlayTiming(
  rec: Record<string, unknown>,
  templateId: string | undefined
): { start?: number; end?: number } {
  const start = rec.start !== undefined ? Number(rec.start) : undefined;
  const end = rec.end !== undefined ? Number(rec.end) : undefined;

  if (start !== undefined && (!Number.isFinite(start) || start < 0)) {
    throw new SchemaError('Invalid template overlay start', {
      templateId,
      received: rec.start,
      fix: 'Use start as seconds (number >= 0)',
    });
  }
  if (end !== undefined && (!Number.isFinite(end) || end < 0)) {
    throw new SchemaError('Invalid template overlay end', {
      templateId,
      received: rec.end,
      fix: 'Use end as seconds (number >= 0)',
    });
  }
  if (start !== undefined && end !== undefined && end < start) {
    throw new SchemaError('Invalid template overlay timing: end < start', {
      templateId,
      start,
      end,
      fix: 'Use end >= start',
    });
  }

  return { start, end };
}

function parseOverlayOpacity(
  rec: Record<string, unknown>,
  templateId: string | undefined
): number | undefined {
  const opacity = rec.opacity !== undefined ? Number(rec.opacity) : undefined;
  if (opacity === undefined) return undefined;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new SchemaError('Invalid template overlay opacity', {
      templateId,
      received: rec.opacity,
      fix: 'Use opacity as a number between 0 and 1',
    });
  }
  return opacity;
}

function parseOverlayPxFields(
  rec: Record<string, unknown>,
  templateId: string | undefined
): { marginPx?: number; widthPx?: number; heightPx?: number } {
  const marginPx = parseOverlayPx(rec, templateId, 'marginPx');
  const widthPx = parseOverlayPx(rec, templateId, 'widthPx');
  const heightPx = parseOverlayPx(rec, templateId, 'heightPx');
  return { marginPx, widthPx, heightPx };
}

function parseOverlayPx(
  rec: Record<string, unknown>,
  templateId: string | undefined,
  key: 'marginPx' | 'widthPx' | 'heightPx'
): number | undefined {
  const value = rec[key] !== undefined ? Number(rec[key]) : undefined;
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new SchemaError(`Invalid template overlay ${key}`, {
      templateId,
      received: rec[key],
      fix: `Use ${key} as a non-negative number (pixels)`,
    });
  }
  return Math.round(value);
}

function inferOverlayKind(src: string): OverlayKind {
  const ext = extname(src).toLowerCase();
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif')
    return 'image';
  if (ext === '.mp4' || ext === '.mov' || ext === '.webm' || ext === '.mkv') return 'video';
  return 'image';
}

/**
 * Extract overlay assets declared by a template.
 *
 * Expected shape in template.json:
 *
 * - assets.overlays: Array<string | { src: string; ... }>
 *
 * Local paths are resolved relative to `templateDir`.
 */
export function getTemplateOverlays(
  template: RenderTemplate | undefined,
  templateDir?: string
): TemplateOverlayAsset[] {
  const assets = asRecord(template?.assets);
  if (!assets) return [];
  const rawOverlays = assets.overlays;
  if (!Array.isArray(rawOverlays) || rawOverlays.length === 0) return [];

  if (!templateDir) {
    throw new SchemaError('Template assets.overlays requires a known templateDir', {
      templateId: template?.id,
      fix: 'Load the template from a file/dir, or install it so CM can resolve its directory',
    });
  }

  const overlays: TemplateOverlayAsset[] = [];
  for (const raw of rawOverlays) {
    const overlay = normalizeOverlayEntry(raw, template?.id);
    const src = overlay.src;

    let resolvedSrc = src;
    if (!isRemoteSource(src)) {
      if (isAbsoluteLike(src)) {
        throw new SchemaError('Invalid template overlay src: absolute paths are not allowed', {
          templateId: template?.id,
          received: src,
          fix: 'Use a relative path inside the template pack, e.g. "assets/overlays/logo.png"',
        });
      }
      const normalized = src.replace(/\\/g, '/');
      if (normalized.includes('..')) {
        throw new SchemaError('Invalid template overlay src: path traversal not allowed', {
          templateId: template?.id,
          received: src,
          fix: 'Remove any ".." segments from assets.overlays[].src',
        });
      }
      if (!isSupportedOverlayPath(src)) {
        throw new SchemaError('Invalid template overlay src: unsupported file extension', {
          templateId: template?.id,
          received: src,
          fix: 'Use a .png/.jpg/.webp/.gif image or .mp4/.mov/.webm video in assets.overlays[].src',
        });
      }
      resolvedSrc = resolve(templateDir, src);
    }

    overlays.push({
      ...overlay,
      src: resolvedSrc,
      kind: overlay.kind ?? inferOverlayKind(src),
      layer: overlay.layer ?? 'below-captions',
      position: overlay.position ?? 'top-right',
      fit: overlay.fit ?? 'contain',
      opacity: overlay.opacity ?? 1,
      marginPx: overlay.marginPx ?? 24,
      muted: overlay.muted ?? true,
    });
  }

  return overlays;
}

/**
 * Merge two font source lists, keeping stable order and removing duplicates.
 */
export function mergeFontSources(preferred: FontSource[] = [], fallback: FontSource[] = []): FontSource[] {
  const out: FontSource[] = [];
  const seen = new Set<string>();
  const keyOf = (f: FontSource) => `${f.family}|${f.src}|${String(f.weight ?? '')}|${String(f.style ?? '')}`;
  for (const font of [...preferred, ...fallback]) {
    const key = keyOf(font);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(font);
  }
  return out;
}

/**
 * Extract supported `template.params` fields and validate their values.
 */
export function getTemplateParams(template?: RenderTemplate): TemplateParams {
  const params = asRecord(template?.params);
  if (!params) return {};

  const result: TemplateParams = {};

  if (params.splitScreenRatio !== undefined) {
    const raw = params.splitScreenRatio;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new SchemaError('Invalid template param: splitScreenRatio must be a number', {
        templateId: template?.id,
        received: raw,
        fix: 'Use a number between 0.3 and 0.7 for template.params.splitScreenRatio',
      });
    }
    if (value < 0.3 || value > 0.7) {
      throw new SchemaError('Invalid template param: splitScreenRatio out of bounds', {
        templateId: template?.id,
        received: value,
        fix: 'Use a splitScreenRatio between 0.3 and 0.7',
      });
    }
    result.splitScreenRatio = value;
  }

  if (typeof params.gameplayPosition === 'string') {
    const value = params.gameplayPosition;
    if (value === 'top' || value === 'bottom' || value === 'full') {
      result.gameplayPosition = value;
    } else {
      throw new SchemaError('Invalid template param: gameplayPosition', {
        templateId: template?.id,
        received: value,
        fix: 'Use one of: top, bottom, full for template.params.gameplayPosition',
      });
    }
  }

  if (typeof params.contentPosition === 'string') {
    const value = params.contentPosition;
    if (value === 'top' || value === 'bottom' || value === 'full') {
      result.contentPosition = value;
    } else {
      throw new SchemaError('Invalid template param: contentPosition', {
        templateId: template?.id,
        received: value,
        fix: 'Use one of: top, bottom, full for template.params.contentPosition',
      });
    }
  }

  return result;
}
