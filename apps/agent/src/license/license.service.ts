import os from 'os';
import {
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseTokenPayload,
  LicenseValidationRequest,
  LicenseValidationResponse,
  Logger,
} from '@erp-bridge/shared';
import { LicenseTokenManager } from '@erp-bridge/core';
import { HWIDManager } from '../security/hwid';
import { SecureStore } from '../security/secure-store';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import { AgentLicenseStatus, LicenseValidationStatus } from './license.types';

export class LicenseService {
  private readonly logger = new Logger('LicenseService');
  private secureStore: SecureStore;
  private currentHwid: string | null = null;
  private licenseStatus: AgentLicenseStatus = 'UNLICENSED';
  private activePlan?: string;
  private licenseCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly eventBus?: EventBus,
    customStoreDir?: string
  ) {
    this.secureStore = new SecureStore(customStoreDir);
  }

  public async getHWID(): Promise<string> {
    if (!this.currentHwid) {
      this.currentHwid = await HWIDManager.getFingerprintHash();
    }
    return this.currentHwid;
  }

  public getLicenseStatus(): { status: AgentLicenseStatus; plan?: string } {
    return { status: this.licenseStatus, plan: this.activePlan };
  }

  public async activateLicense(licenseKey: string): Promise<LicenseActivationResponse> {
    const hwid = await this.getHWID();
    const config = this.configManager.get();
    this.logger.info(`Iniciando activación de licencia: ${licenseKey.substring(0, 8)}... (HWID: ${hwid.substring(0, 16)}...)`);

    const requestPayload: LicenseActivationRequest = {
      licenseKey,
      hwid,
      agentId: config.agentId,
      machineInfo: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
      },
    };

    const response = await fetch(`${config.apiBaseUrl}/api/v1/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const resJson = (await response.json()) as { data?: LicenseActivationResponse; error?: { message?: string } };

    if (!response.ok || !resJson.data?.success) {
      const msg = resJson.error?.message || resJson.data?.error || `Error HTTP ${response.status}`;
      this.logger.warn(`Fallo al activar licencia: ${msg}`);
      return { success: false, error: msg };
    }

    const activation = resJson.data;
    if (activation.licenseToken) {
      await this.secureStore.saveLicenseToken(activation.licenseToken, hwid);
      this.configManager.setLicenseKey(licenseKey);
      this.licenseStatus = 'VALID';
      this.activePlan = activation.plan;
      this.logger.info(`✓ Licencia activada con éxito. Plan: ${activation.plan}, Expira: ${activation.expiresAt}`);
      this.eventBus?.addEvent('success', `✓ Licencia activada (${activation.plan})`);
    }

    return activation;
  }

  public async validateLicense(): Promise<LicenseValidationStatus> {
    const hwid = await this.getHWID();
    const config = this.configManager.get();
    const token = await this.secureStore.loadLicenseToken(hwid);

    if (!token) {
      this.licenseStatus = 'UNLICENSED';
      this.activePlan = undefined;
      return { status: 'UNLICENSED', message: 'No hay token de licencia guardado en este equipo' };
    }

    // 1. Check local token payload with cryptographic verification and HWID binding
    const verification = LicenseTokenManager.verifyToken(token);
    const localPayload: LicenseTokenPayload | null = verification.valid && verification.payload ? verification.payload : null;
    const now = Date.now();
    const isLocalTokenValid = localPayload ? (now <= localPayload.expiresAt && (!localPayload.hwid || localPayload.hwid === hwid)) : false;

    // 2. Attempt online validation and token renewal
    try {
      const requestPayload: LicenseValidationRequest = {
        licenseToken: token,
        hwid,
        agentVersion: '0.1.0',
      };

      const response = await fetch(`${config.apiBaseUrl}/api/v1/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(2000),
      });

      const resJson = (await response.json()) as { data?: LicenseValidationResponse; error?: { message?: string } };

      if (response.ok && resJson.data?.valid) {
        if (resJson.data.renewedToken) {
          await this.secureStore.saveLicenseToken(resJson.data.renewedToken, hwid);
        }
        this.licenseStatus = 'VALID';
        this.activePlan = resJson.data.plan;
        return { status: 'VALID', plan: resJson.data.plan };
      } else if (response.status === 403 || response.status === 400) {
        this.licenseStatus = 'EXPIRED';
        this.activePlan = undefined;
        return { status: 'EXPIRED', message: resJson.error?.message || 'Licencia revocada o expirada' };
      }
    } catch {
      // Offline / Network failure -> fallback to local token verification
    }

    if (isLocalTokenValid && localPayload) {
      this.licenseStatus = 'GRACE_PERIOD';
      this.activePlan = localPayload.plan;
      const remainingHours = Math.round((localPayload.expiresAt - now) / 3600000);
      this.logger.warn(`Operando en período de gracia offline (${remainingHours}h restantes). Plan: ${localPayload.plan}`);
      return { status: 'GRACE_PERIOD', plan: localPayload.plan };
    }

    this.licenseStatus = 'EXPIRED';
    this.activePlan = undefined;
    return { status: 'EXPIRED', message: 'Período de gracia expirado sin conexión al servidor' };
  }

  public async deactivateLicense(customKey?: string): Promise<{ success: boolean; message?: string }> {
    const config = this.configManager.get();
    const key = customKey || config.licenseKey;
    const hwid = await this.getHWID();

    if (key && config.apiBaseUrl) {
      try {
        await fetch(`${config.apiBaseUrl}/api/v1/licenses/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key, hwid }),
        });
      } catch {}
    }

    await this.secureStore.deleteLicenseToken();
    this.configManager.setLicenseKey(undefined);
    this.licenseStatus = 'UNLICENSED';
    this.activePlan = undefined;
    this.logger.info('Licencia desactivada y credenciales locales eliminadas.');
    this.eventBus?.addEvent('warn', 'Licencia desactivada en este equipo.');

    return { success: true };
  }

  public startValidationLoop(onRevalidated?: () => void): void {
    if (this.licenseCheckTimer) {
      clearInterval(this.licenseCheckTimer);
    }
    const intervalMs = 24 * 60 * 60 * 1000;
    this.licenseCheckTimer = setInterval(async () => {
      await this.validateLicense();
      onRevalidated?.();
    }, intervalMs);
  }

  public stopValidationLoop(): void {
    if (this.licenseCheckTimer) {
      clearInterval(this.licenseCheckTimer);
      this.licenseCheckTimer = null;
    }
  }
}
