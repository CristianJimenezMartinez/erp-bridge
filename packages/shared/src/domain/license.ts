import { z } from 'zod';

export type LicensePlan = 'trial' | 'starter' | 'professional' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export const LicensePlanSchema = z.enum(['trial', 'starter', 'professional', 'enterprise']);
export const LicenseStatusSchema = z.enum(['active', 'expired', 'revoked', 'suspended']);

export interface License {
  id: string;
  key: string;
  organizationId: string;
  plan: LicensePlan;
  status: LicenseStatus;
  maxActivations: number;
  currentActivations: number;
  createdAt: Date;
  expiresAt?: Date | null;
  trialEndsAt?: Date | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
}

export const LicenseSchema = z.object({
  id: z.string().uuid(),
  key: z.string().regex(/^EB-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}$/),
  organizationId: z.string().min(1),
  plan: LicensePlanSchema,
  status: LicenseStatusSchema,
  maxActivations: z.number().int().min(1),
  currentActivations: z.number().int().min(0),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  revokedAt: z.coerce.date().nullable().optional(),
  revokedReason: z.string().nullable().optional(),
});

export interface LicenseActivation {
  id: string;
  licenseId: string;
  hwid: string;
  agentId?: string | null;
  machineInfo?: Record<string, unknown> | null;
  activatedAt: Date;
  lastValidatedAt: Date;
  deactivatedAt?: Date | null;
}

export const LicenseActivationSchema = z.object({
  id: z.string().uuid(),
  licenseId: z.string().uuid(),
  hwid: z.string().min(16),
  agentId: z.string().uuid().nullable().optional(),
  machineInfo: z.record(z.unknown()).nullable().optional(),
  activatedAt: z.coerce.date(),
  lastValidatedAt: z.coerce.date(),
  deactivatedAt: z.coerce.date().nullable().optional(),
});

export interface HardwareFingerprint {
  macAddress?: string;
  diskSerial?: string;
  computerName?: string;
  windowsSID?: string;
  fingerprint: string;
}

export const HardwareFingerprintSchema = z.object({
  macAddress: z.string().optional(),
  diskSerial: z.string().optional(),
  computerName: z.string().optional(),
  windowsSID: z.string().optional(),
  fingerprint: z.string().min(16),
});

export interface LicenseTokenPayload {
  licenseId: string;
  organizationId: string;
  plan: LicensePlan;
  hwid: string;
  agentId?: string;
  issuedAt: number; // UNIX timestamp ms
  expiresAt: number; // UNIX timestamp ms
}

export const LicenseTokenPayloadSchema = z.object({
  licenseId: z.string().uuid(),
  organizationId: z.string().min(1),
  plan: LicensePlanSchema,
  hwid: z.string().min(16),
  agentId: z.string().uuid().optional(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export interface LicenseActivationRequest {
  licenseKey: string;
  hwid: string;
  agentId?: string;
  machineInfo?: Record<string, unknown>;
}

export const LicenseActivationRequestSchema = z.object({
  licenseKey: z.string().min(1),
  hwid: z.string().min(16),
  agentId: z.string().uuid().optional(),
  machineInfo: z.record(z.unknown()).optional(),
});

export interface LicenseActivationResponse {
  success: boolean;
  licenseToken?: string;
  plan?: LicensePlan;
  expiresAt?: string;
  gracePeriodDays?: number;
  error?: string;
}

export const LicenseActivationResponseSchema = z.object({
  success: z.boolean(),
  licenseToken: z.string().optional(),
  plan: LicensePlanSchema.optional(),
  expiresAt: z.string().optional(),
  gracePeriodDays: z.number().optional(),
  error: z.string().optional(),
});

export interface LicenseValidationRequest {
  licenseToken: string;
  hwid: string;
  agentVersion?: string;
}

export const LicenseValidationRequestSchema = z.object({
  licenseToken: z.string().min(1),
  hwid: z.string().min(16),
  agentVersion: z.string().optional(),
});

export interface LicenseValidationResponse {
  valid: boolean;
  plan?: LicensePlan;
  renewedToken?: string;
  expiresAt?: string;
  gracePeriodRemainingSeconds?: number;
  message?: string;
}

export const LicenseValidationResponseSchema = z.object({
  valid: z.boolean(),
  plan: LicensePlanSchema.optional(),
  renewedToken: z.string().optional(),
  expiresAt: z.string().optional(),
  gracePeriodRemainingSeconds: z.number().optional(),
  message: z.string().optional(),
});

export interface CreateLicenseDto {
  organizationId: string;
  plan: LicensePlan;
  maxActivations?: number;
  expiresAt?: Date | string | null;
  trialDays?: number;
}

export const CreateLicenseDtoSchema = z.object({
  organizationId: z.string().min(1),
  plan: LicensePlanSchema,
  maxActivations: z.number().int().min(1).default(1),
  expiresAt: z.union([z.coerce.date(), z.null()]).optional(),
  trialDays: z.number().int().min(1).optional(),
});
