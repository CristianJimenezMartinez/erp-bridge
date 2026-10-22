import os from 'os';
import {
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseValidationRequest,
  LicenseValidationResponse,
} from '@erp-bridge/shared';
import { AgentDiskLogger } from '../diagnostics/disk-logger';

/**
 * Validates that the license server base URL is strictly HTTPS (or loopback HTTP for local testing)
 * before sending license keys, HWIDs, or machine metadata over the network.
 */
export function resolveSafeLicenseApiBaseUrl(rawUrl?: string): string {
  const candidate = String(rawUrl || 'https://bridge.cristianjm.com').trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:') {
      return candidate;
    }
    if (parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
      return candidate;
    }
  } catch {}
  return 'https://bridge.cristianjm.com';
}

export async function requestRemoteLicenseActivation(
  apiBaseUrl: string,
  licenseKey: string,
  hwid: string,
  agentId?: string
): Promise<{ ok: boolean; status: number; data?: LicenseActivationResponse; errorMsg?: string }> {
  const safeBaseUrl = resolveSafeLicenseApiBaseUrl(apiBaseUrl);
  const requestPayload: LicenseActivationRequest = {
    licenseKey,
    hwid,
    agentId,
    machineInfo: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
    },
  };

  const tActivateStart = performance.now();
  const response = await fetch(`${safeBaseUrl}/api/v1/licenses/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
  });
  const activateDurationMs = Math.round(performance.now() - tActivateStart);

  const resJson = (await response.json()) as { data?: LicenseActivationResponse; error?: { message?: string } };

  AgentDiskLogger.getInstance().log({
    level: response.ok && resJson.data?.success ? 'SUCCESS' : 'ERROR',
    component: 'LicenseService',
    action: 'activate_license',
    duration_ms: activateDurationMs,
    status: response.ok && resJson.data?.success ? 'SUCCESS' : 'FAILURE',
    message: response.ok && resJson.data?.success
      ? `Licencia activada con éxito en ${activateDurationMs}ms (Plan: ${resJson.data.plan})`
      : `Fallo al activar licencia tras ${activateDurationMs}ms: ${resJson.error?.message || resJson.data?.error || `HTTP ${response.status}`}`,
    metadata: {
      plan: resJson.data?.plan,
    },
  });

  if (!response.ok || !resJson.data?.success) {
    const errorMsg = resJson.error?.message || resJson.data?.error || `Error HTTP ${response.status}`;
    return { ok: false, status: response.status, errorMsg };
  }

  return { ok: true, status: response.status, data: resJson.data };
}

export async function requestRemoteLicenseValidation(
  apiBaseUrl: string,
  token: string,
  hwid: string,
  agentVersion: string
): Promise<{ ok: boolean; status: number; data?: LicenseValidationResponse; errorMsg?: string }> {
  const safeBaseUrl = resolveSafeLicenseApiBaseUrl(apiBaseUrl);
  const requestPayload: LicenseValidationRequest = {
    licenseToken: token,
    hwid,
    agentVersion,
  };

  const tValidateStart = performance.now();
  const response = await fetch(`${safeBaseUrl}/api/v1/licenses/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
    signal: AbortSignal.timeout(2000),
  });
  const validateDurationMs = Math.round(performance.now() - tValidateStart);

  const resJson = (await response.json()) as { data?: LicenseValidationResponse; error?: { message?: string } };

  AgentDiskLogger.getInstance().log({
    level: response.ok && resJson.data?.valid ? 'SUCCESS' : 'INFO',
    component: 'LicenseService',
    action: 'validate_license_online',
    duration_ms: validateDurationMs,
    status: response.ok && resJson.data?.valid ? 'SUCCESS' : 'FAILURE',
    message: response.ok && resJson.data?.valid
      ? `Validación online de licencia completada en ${validateDurationMs}ms (Plan: ${resJson.data.plan || 'Activo'})`
      : `Validación online tras ${validateDurationMs}ms (HTTP ${response.status})`,
    metadata: {
      valid: resJson.data?.valid,
      plan: resJson.data?.plan,
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    data: resJson.data,
    errorMsg: resJson.error?.message,
  };
}
