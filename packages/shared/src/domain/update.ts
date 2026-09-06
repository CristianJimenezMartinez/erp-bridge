import { z } from 'zod';

export type UpdateChannel = 'stable' | 'beta' | 'critical';
export type UpdatePlatform = 'win32_x64' | 'win32_arm64' | 'linux_x64' | 'darwin_x64';
export type UpdateStatus = 'success' | 'rollback' | 'failed';

export const UpdateChannelSchema = z.enum(['stable', 'beta', 'critical']);
export const UpdatePlatformSchema = z.enum(['win32_x64', 'win32_arm64', 'linux_x64', 'darwin_x64']);
export const UpdateStatusSchema = z.enum(['success', 'rollback', 'failed']);

export interface UpdateManifest {
  id?: string;
  version: string;
  channel: UpdateChannel;
  platform: UpdatePlatform;
  downloadUrl: string;
  sha256: string;
  signature: string; // Ed25519 digital signature (base64)
  fileSize?: number;
  releaseNotes?: string;
  mandatory?: boolean;
  minVersion?: string;
  publishedAt?: Date;
}

export const UpdateManifestSchema = z.object({
  id: z.string().uuid().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/),
  channel: UpdateChannelSchema.default('stable'),
  platform: UpdatePlatformSchema.default('win32_x64'),
  downloadUrl: z.string().url(),
  sha256: z.string().length(64),
  signature: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  releaseNotes: z.string().optional(),
  mandatory: z.boolean().default(false),
  minVersion: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
});

export interface UpdateCheckRequest {
  agentId: string;
  currentVersion: string;
  licenseKey?: string;
  platform: string;
  arch: string;
  channel?: UpdateChannel;
}

export const UpdateCheckRequestSchema = z.object({
  agentId: z.string(),
  currentVersion: z.string(),
  licenseKey: z.string().optional(),
  platform: z.string(),
  arch: z.string(),
  channel: UpdateChannelSchema.optional().default('stable'),
});

export interface UpdateCheckResponse {
  available: boolean;
  version?: string;
  downloadUrl?: string;
  sha256?: string;
  signature?: string;
  fileSize?: number;
  releaseNotes?: string;
  mandatory?: boolean;
  minVersion?: string;
  channel?: UpdateChannel;
}

export const UpdateCheckResponseSchema = z.object({
  available: z.boolean(),
  version: z.string().optional(),
  downloadUrl: z.string().optional(),
  sha256: z.string().optional(),
  signature: z.string().optional(),
  fileSize: z.number().optional(),
  releaseNotes: z.string().optional(),
  mandatory: z.boolean().optional(),
  minVersion: z.string().optional(),
  channel: UpdateChannelSchema.optional(),
});

export interface UpdateConfirmRequest {
  agentId: string;
  fromVersion: string;
  toVersion: string;
  status: UpdateStatus;
  errorMessage?: string;
}

export const UpdateConfirmRequestSchema = z.object({
  agentId: z.string(),
  fromVersion: z.string(),
  toVersion: z.string(),
  status: UpdateStatusSchema,
  errorMessage: z.string().optional(),
});

export interface UpdateHistoryEntry {
  id: string;
  agentId: string;
  fromVersion?: string | null;
  toVersion?: string | null;
  status: UpdateStatus;
  errorMessage?: string | null;
  attemptedAt: Date;
}

export const UpdateHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string(),
  fromVersion: z.string().nullable().optional(),
  toVersion: z.string().nullable().optional(),
  status: UpdateStatusSchema,
  errorMessage: z.string().nullable().optional(),
  attemptedAt: z.coerce.date(),
});
