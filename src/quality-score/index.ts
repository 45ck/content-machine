/**
 * Quality Score module barrel exports.
 */
export { QualityLabelSchema, QualitySubscoresSchema, QualityTagsSchema } from '../domain';
export type { QualityLabel, QualitySubscores, QualityTags } from '../domain';

export { FeatureVectorSchema, RepoMetricFeaturesSchema, MetadataFeaturesSchema } from '../domain';
export type { FeatureVector, RepoMetricFeatures, MetadataFeatures } from '../domain';

export { extractFeatures } from './feature-extractor';
export type { FeatureExtractorOptions } from './feature-extractor';

export { scoreQuality } from './scorer';
export type { QualityScoreResult, QualityScoreOptions } from './scorer';
