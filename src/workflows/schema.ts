/**
 * Workflow schemas
 *
 * Defines the data-only workflow definition format.
 */
import { z } from 'zod';

export const WORKFLOW_SCHEMA_VERSION = '1.0.0';

export const WorkflowStageModeEnum = z.enum(['builtin', 'external', 'import']);
export type WorkflowStageMode = z.infer<typeof WorkflowStageModeEnum>;

export const WorkflowCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type WorkflowCommand = z.infer<typeof WorkflowCommandSchema>;

export const WorkflowStageSchema = z.object({
  mode: WorkflowStageModeEnum.default('builtin'),
  exec: WorkflowCommandSchema.optional(),
});

export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

export const WorkflowInputsSchema = z
  .object({
    script: z.string().optional(),
    audio: z.string().optional(),
    timestamps: z.string().optional(),
    visuals: z.string().optional(),
  })
  .partial();

export type WorkflowInputs = z.infer<typeof WorkflowInputsSchema>;

export const WorkflowStagesSchema = z
  .object({
    script: WorkflowStageSchema.optional(),
    audio: WorkflowStageSchema.optional(),
    visuals: WorkflowStageSchema.optional(),
    render: WorkflowStageSchema.optional(),
  })
  .partial();

export type WorkflowStages = z.infer<typeof WorkflowStagesSchema>;

export const WorkflowHooksSchema = z
  .object({
    pre: z.array(WorkflowCommandSchema).optional(),
    post: z.array(WorkflowCommandSchema).optional(),
  })
  .partial();

export type WorkflowHooks = z.infer<typeof WorkflowHooksSchema>;

export const WorkflowDefinitionSchema = z.object({
  schemaVersion: z.string().default(WORKFLOW_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  defaults: z.record(z.unknown()).optional(),
  inputs: WorkflowInputsSchema.optional(),
  stages: WorkflowStagesSchema.optional(),
  hooks: WorkflowHooksSchema.optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
