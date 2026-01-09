/**
 * Template asset slot + params helpers.
 */
import type { VideoTemplate } from './schema';
import { SchemaError } from '../../core/errors';

export interface GameplayAssetSlot {
  library?: string;
  style?: string;
  clip?: string;
  required?: boolean;
}

export interface TemplateParams {
  splitScreenRatio?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function getTemplateGameplaySlot(template?: VideoTemplate): GameplayAssetSlot | null {
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

export function getTemplateParams(template?: VideoTemplate): TemplateParams {
  const params = asRecord(template?.params);
  if (!params || params.splitScreenRatio === undefined) return {};

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

  return { splitScreenRatio: value };
}
