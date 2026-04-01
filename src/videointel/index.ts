/**
 * Video Intelligence module.
 *
 * Bridges the reverse-engineering pipeline (VideoSpec) with the forward pipeline (script → render).
 *
 * @module videointel
 */

// Schema types/schemas are re-exported via src/domain/index.ts.
// Import them from '../domain' in consuming code.

export { classifyVideoSpec, type ClassifyOptions } from './classify';
export { extractBlueprint, type ExtractBlueprintOptions } from './blueprint';
export { buildBlueprintContext } from './blueprint-context';
export {
  compareVideoSpecs,
  type ReconstructionFidelityReport,
  type MetricScore,
  type CompareSpecsOptions,
} from './compare';
