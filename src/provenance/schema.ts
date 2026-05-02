import { z } from 'zod';

export const ASSET_LEDGER_SCHEMA_VERSION = '1.0.0';

export const AssetLedgerEntrySchema = z
  .object({
    assetId: z.string().min(1).optional(),
    assetType: z.string().min(1).optional(),
    kind: z.string().min(1).optional(),
    stage: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    localPath: z.string().min(1).optional(),
    sourceUrl: z.string().min(1).optional(),
    originalVideoUrl: z.string().min(1).optional(),
    provider: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    licenseName: z.string().min(1).optional(),
    licenseUrl: z.string().min(1).optional(),
    licenseStatus: z.string().min(1).optional(),
    rightsStatus: z.string().min(1).optional(),
    attributionText: z.string().optional(),
    attributionPlacement: z.string().min(1).optional(),
    attributionRequired: z.boolean().optional(),
    usageMode: z.string().min(1).optional(),
    rightsFlags: z.union([z.array(z.string()), z.record(z.unknown())]).optional(),
    evidenceFiles: z.array(z.string().min(1)).optional(),
    licenseCertificatePath: z.string().min(1).optional(),
    permissionEvidencePath: z.string().min(1).optional(),
    reviewStatus: z.string().min(1).optional(),
    contentIdRisk: z.string().min(1).optional(),
    platformSource: z.string().min(1).optional(),
    mixRole: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
    generationPrompt: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    workflow: z.string().min(1).optional(),
    outputHash: z.string().min(1).optional(),
    fileHash: z.string().min(1).optional(),
    createdAt: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .passthrough();

export const AssetLedgerSummarySchema = z
  .object({
    assetCount: z.number().int().nonnegative(),
    generatedCount: z.number().int().nonnegative().default(0),
    externalCount: z.number().int().nonnegative().default(0),
    needsReviewCount: z.number().int().nonnegative().default(0),
    audioCount: z.number().int().nonnegative().default(0),
  })
  .strict();

export const AssetLedgerSchema = z
  .object({
    schemaVersion: z.string().default(ASSET_LEDGER_SCHEMA_VERSION),
    assets: z.array(AssetLedgerEntrySchema),
    summary: AssetLedgerSummarySchema.optional(),
    warnings: z.array(z.string()).default([]),
    createdAt: z
      .string()
      .min(1)
      .default(() => new Date().toISOString()),
  })
  .strict();

export const AssetLedgerInputSchema = z.union([
  AssetLedgerSchema,
  z
    .object({
      schemaVersion: z.string().optional(),
      items: z.array(AssetLedgerEntrySchema),
    })
    .passthrough(),
  z.array(AssetLedgerEntrySchema),
]);

export type AssetLedgerEntry = z.output<typeof AssetLedgerEntrySchema>;
export type AssetLedger = z.output<typeof AssetLedgerSchema>;
export type AssetLedgerInput = z.output<typeof AssetLedgerInputSchema>;
