import { License, LicenseTokenPayload, LicenseWithActivations } from '@erp-bridge/shared';
import { ILicenseRepository } from '../database/repositories/license.repository';
import { LicenseTokenManager } from './license-token';

export const GRACE_PERIOD_DAYS = 7;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface FleetOverviewSummary {
  totalLicenses: number;
  totalAllowedSeats: number;
  activeSeats: number;
  onlineSeats: number;
  plan: string;
  licenses: LicenseWithActivations[];
}

/**
 * In-memory keyed mutex map to serialize concurrent license activation/deactivation
 * operations per normalized license key or ID, preventing TOCTOU seat-limit bypasses.
 */
const licenseKeyLocks = new Map<string, Promise<unknown>>();

export async function withLicenseKeyLock<T>(lockKey: string, task: () => Promise<T>): Promise<T> {
  const safeKey = lockKey || '__default__';
  const previous = licenseKeyLocks.get(safeKey) ?? Promise.resolve();

  let release!: () => void;
  const currentGate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const chained = previous.then(() => currentGate, () => currentGate);
  licenseKeyLocks.set(safeKey, chained);

  await previous.catch(() => undefined);

  try {
    return await task();
  } finally {
    release();
    if (licenseKeyLocks.get(safeKey) === chained) {
      licenseKeyLocks.delete(safeKey);
    }
  }
}

/**
 * Validates that a license is active and has not expired. If expired, updates status in repository.
 */
export async function verifyLicenseActiveState(
  license: License | null,
  repository: ILicenseRepository,
  notFoundError: string
): Promise<{ ok: true; license: License } | { ok: false; error: string }> {
  if (!license) {
    return { ok: false, error: notFoundError };
  }
  if (license.status === 'revoked') {
    return { ok: false, error: `Licencia revocada: ${license.revokedReason || 'Contacte con soporte'}` };
  }
  if (license.status === 'suspended') {
    return { ok: false, error: 'Licencia temporalmente suspendida' };
  }
  if (license.expiresAt && new Date() > license.expiresAt) {
    license.status = 'expired';
    await repository.updateLicense(license);
    return { ok: false, error: 'La licencia ha expirado' };
  }
  return { ok: true, license };
}

/**
 * Creates a fresh 7-day signed JWT license token for an activated machine.
 */
export function issueSignedMachineToken(
  license: License,
  hwid: string,
  agentId?: string
): { token: string; expiresAtIso: string } {
  const payload: LicenseTokenPayload = {
    licenseId: license.id,
    organizationId: license.organizationId,
    plan: license.plan,
    hwid,
    agentId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + GRACE_PERIOD_MS,
  };
  return {
    token: LicenseTokenManager.createToken(payload),
    expiresAtIso: new Date(payload.expiresAt).toISOString(),
  };
}

/**
 * Aggregates fleet seat metrics across an organization's licenses and activations.
 */
export function buildFleetOverview(licenses: LicenseWithActivations[]): FleetOverviewSummary {
  let totalAllowedSeats = 0;
  let activeSeats = 0;
  let onlineSeats = 0;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  for (const lic of licenses) {
    totalAllowedSeats += lic.maxActivations;
    activeSeats += lic.activations.length;
    for (const act of lic.activations) {
      const lastVal = new Date(act.lastValidatedAt).getTime();
      if (now - lastVal < twentyFourHours) {
        onlineSeats++;
      }
    }
  }

  const primaryPlan = licenses[0]?.plan || 'starter';

  return {
    totalLicenses: licenses.length,
    totalAllowedSeats: Math.max(totalAllowedSeats, 1),
    activeSeats,
    onlineSeats,
    plan: primaryPlan,
    licenses,
  };
}
