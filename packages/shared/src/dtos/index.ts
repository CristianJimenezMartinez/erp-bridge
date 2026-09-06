import { z } from 'zod';

export const CreateOrganizationDtoSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  slug: z.string().min(2).optional(),
  plan: z.string().default('starter'),
});

export type CreateOrganizationDto = z.infer<typeof CreateOrganizationDtoSchema>;

export const CreateConnectionDtoSchema = z.object({
  organizationId: z.string(),
  connectorId: z.string(),
  name: z.string().min(2),
  agentId: z.string().optional(),
  configuration: z.record(z.string(), z.unknown()),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type CreateConnectionDto = z.infer<typeof CreateConnectionDtoSchema>;

export const UpdateConnectionDtoSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['CONNECTED', 'ERROR', 'DISCONNECTED', 'PAUSED']).optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateConnectionDto = z.infer<typeof UpdateConnectionDtoSchema>;

export const CreateSyncJobDtoSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(2),
  sourceConnectionId: z.string(),
  destinationConnectionId: z.string(),
  entity: z.enum(['products', 'stock', 'orders', 'customers']).default('products'),
  direction: z.enum(['ONE_WAY_SOURCE_TO_DEST', 'ONE_WAY_DEST_TO_SOURCE', 'TWO_WAY']).default('ONE_WAY_SOURCE_TO_DEST'),
  schedule: z.string().default('MANUAL'),
  configuration: z.record(z.string(), z.unknown()).default({}),
  mappings: z.array(z.object({
    sourceField: z.string(),
    destinationField: z.string(),
    transformation: z.string().optional(),
    defaultValue: z.unknown().optional(),
  })).optional(),
});

export type CreateSyncJobDto = z.infer<typeof CreateSyncJobDtoSchema>;

export const RunSyncJobDtoSchema = z.object({
  limit: z.number().int().positive().optional(),
  forceFullSync: z.boolean().default(false),
});

export type RunSyncJobDto = z.infer<typeof RunSyncJobDtoSchema>;

export const TestConnectionDtoSchema = z.object({
  connectorId: z.string(),
  configuration: z.record(z.string(), z.unknown()),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type TestConnectionDto = z.infer<typeof TestConnectionDtoSchema>;
