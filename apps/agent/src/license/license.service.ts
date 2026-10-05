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
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { AgentLicenseStatus, LicenseValidationStatus } from './license.types';
import { verifyLicenseProof, isSignedLicenseProof, DEFAULT_LICENSE_PROOF_PUBLIC_KEY, VerifiedLicenseProof } from './license-proof';

/**
 * Si es true, el periodo de gracia OFFLINE solo se concede con una prueba Ed25519 válida emitida
 * por el servidor. El token HS256 por sí solo no es de fiar en el cliente (su secreto no se puede
 * custodiar localmente). La validación ONLINE sigue siendo la autoridad y no depende de esto.
 */
export const REQUIRE_SIGNED_LICENSE_PROOF = true;

export class LicenseService {
  private readonly logger = new Logger('LicenseService');
  private secureStore: SecureStore;
  private currentHwid: string | null = null;
  private licenseStatus: AgentLicenseStatus = 'UNLICENSED';
  private activePlan?: string;
  private licenseCheckTimer: NodeJS.Timeout | null = null;
  private lastSeenTimestamp = 0;
  private lastOnlineTimestamp = 0;
  private tokenExpiresAt = 0;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly eventBus?: EventBus,
    customStoreDir?: string,
    private readonly proofPublicKeyPem: string = DEFAULT_LICENSE_PROOF_PUBLIC_KEY
  ) {
    this.secureStore = new SecureStore(customStoreDir);
  }

  /** Verifica y persiste la prueba Ed25519 recibida del servidor (si la hay). */
  private async persistProofIfValid(rawProof: unknown, hwid: string): Promise<VerifiedLicenseProof | null> {
    if (!isSignedLicenseProof(rawProof)) return null;
    const verified = verifyLicenseProof(rawProof, hwid, this.proofPublicKeyPem);
    if (!verified) {
      this.logger.warn('Prueba de licencia recibida con firma inválida: se ignora.');
      return null;
    }
    await this.secureStore.saveLicenseProof(JSON.stringify(rawProof), hwid);
    return verified;
  }

  private async loadVerifiedProof(hwid: string): Promise<VerifiedLicenseProof | null> {
    const raw = await this.secureStore.loadLicenseProof(hwid);
    if (!raw) return null;
    try {
      return verifyLicenseProof(JSON.parse(raw), hwid, this.proofPublicKeyPem);
    } catch {
      return null;
    }
  }

  public async getHWID(): Promise<string> {
    if (!this.currentHwid) {
      this.currentHwid = await HWIDManager.getFingerprintHash();
    }
    return this.currentHwid;
  }

  public getLicenseStatus(): { status: AgentLicenseStatus; plan?: string } {
    if (this.tokenExpiresAt > 0 && Date.now() >= this.tokenExpiresAt && (this.licenseStatus === 'VALID' || this.licenseStatus === 'GRACE_PERIOD')) {
      this.licenseStatus = 'EXPIRED';
      this.activePlan = undefined;
    }
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

    const tActivateStart = performance.now();
    const response = await fetch(`${config.apiBaseUrl}/api/v1/licenses/activate`, {
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
      const msg = resJson.error?.message || resJson.data?.error || `Error HTTP ${response.status}`;
      this.logger.warn(`Fallo al activar licencia: ${msg}`);
      return { success: false, error: msg };
    }

    const activation = resJson.data;
    if (activation.licenseToken) {
      await this.secureStore.saveLicenseToken(activation.licenseToken, hwid);
      const activationProofOk = await this.persistProofIfValid((activation as unknown as { licenseProof?: unknown }).licenseProof, hwid);
      if (!activationProofOk) {
        await this.secureStore.deleteLicenseProof();
      }
      this.configManager.setLicenseKey(licenseKey);
      this.licenseStatus = 'VALID';
      this.activePlan = activation.plan;
      if (activation.expiresAt) {
        this.tokenExpiresAt = new Date(activation.expiresAt).getTime();
      }
      this.lastSeenTimestamp = Math.max(this.lastSeenTimestamp, Date.now());
      this.lastOnlineTimestamp = Date.now();
      await this.secureStore.saveLastSeenTimestamp(this.lastSeenTimestamp, hwid);
      await this.secureStore.saveLastOnlineTimestamp(this.lastOnlineTimestamp, hwid);
      this.logger.info(`✓ Licencia activada con éxito. Plan: ${activation.plan}, Expira: ${activation.expiresAt}`);
      this.eventBus?.addEvent('success', `✓ Licencia activada (${activation.plan})`);
    }

    return activation;
  }

  public async validateLicense(): Promise<LicenseValidationStatus> {
    const hwid = await this.getHWID();
    const config = this.configManager.get();
    const token = await this.secureStore.loadLicenseToken(hwid);

    // Cargar timestamp monotónico persistido en disco si aún no está inicializado
    if (this.lastSeenTimestamp === 0) {
      const persistedTs = await this.secureStore.loadLastSeenTimestamp(hwid);
      this.lastSeenTimestamp = Math.max(this.lastSeenTimestamp, persistedTs);
    }

    if (!token) {
      this.licenseStatus = 'UNLICENSED';
      this.activePlan = undefined;
      return { status: 'UNLICENSED', message: 'No hay token de licencia guardado en este equipo' };
    }

    // 1. Check local token payload with cryptographic verification and HWID binding
    const verification = LicenseTokenManager.verifyToken(token);
    const localPayload: LicenseTokenPayload | null = verification.valid && verification.payload ? verification.payload : null;
    if (localPayload?.expiresAt) {
      this.tokenExpiresAt = localPayload.expiresAt;
    }
    const now = Date.now();

    // Detección de manipulación de reloj (Clock Rollback)
    if (this.lastSeenTimestamp > 0 && now < this.lastSeenTimestamp) {
      this.logger.error(`Manipulación de reloj detectada: La hora actual del sistema (${now}) es anterior al último timestamp registrado (${this.lastSeenTimestamp}). Bloqueando período de gracia.`);
      this.licenseStatus = 'EXPIRED';
      this.activePlan = undefined;
      this.eventBus?.addEvent('error', 'Manipulación de reloj detectada: La hora del sistema fue retrasada.');
      return { status: 'EXPIRED', message: 'Manipulación del reloj del sistema detectada (Clock Rollback)' };
    }

    if (localPayload && now < localPayload.issuedAt) {
      this.logger.error(`Manipulación de reloj detectada: La hora actual del sistema (${now}) es anterior a la emisión del token (${localPayload.issuedAt}).`);
      this.licenseStatus = 'EXPIRED';
      this.activePlan = undefined;
      this.eventBus?.addEvent('error', 'Manipulación de reloj detectada: Fecha anterior a la emisión de la licencia.');
      return { status: 'EXPIRED', message: 'Manipulación del reloj del sistema detectada: Fecha previa a la emisión de la licencia' };
    }

    this.lastSeenTimestamp = Math.max(this.lastSeenTimestamp, now);
    await this.secureStore.saveLastSeenTimestamp(this.lastSeenTimestamp, hwid);
    const isLocalTokenValid = localPayload ? (now <= localPayload.expiresAt && (!localPayload.hwid || localPayload.hwid === hwid)) : false;

    // 2. Attempt online validation and token renewal
    try {
      const requestPayload: LicenseValidationRequest = {
        licenseToken: token,
        hwid,
        agentVersion: this.configManager.getVersion(),
      };

      const tValidateStart = performance.now();
      const response = await fetch(`${config.apiBaseUrl}/api/v1/licenses/validate`, {
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

      if (response.ok && resJson.data?.valid) {
        if (resJson.data.renewedToken) {
          await this.secureStore.saveLicenseToken(resJson.data.renewedToken, hwid);
        }
        await this.persistProofIfValid((resJson.data as unknown as { licenseProof?: unknown }).licenseProof, hwid);
        this.licenseStatus = 'VALID';
        this.activePlan = resJson.data.plan;
        this.lastOnlineTimestamp = Date.now();
        await this.secureStore.saveLastOnlineTimestamp(this.lastOnlineTimestamp, hwid);
        return { status: 'VALID', plan: resJson.data.plan };
      } else if (response.status === 403 || response.status === 400) {
        this.licenseStatus = 'EXPIRED';
        this.activePlan = undefined;
        return { status: 'EXPIRED', message: resJson.error?.message || 'Licencia revocada o expirada' };
      }
    } catch {
      // Offline / Network failure -> fallback to local token verification
    }

    // Fuente de confianza para el modo offline: prueba Ed25519 verificada con la clave pública embebida.
    // El payload HS256 solo se admite si REQUIRE_SIGNED_LICENSE_PROOF está desactivado (compatibilidad).
    const proof = await this.loadVerifiedProof(hwid);
    const gracePayload: { plan: string; issuedAt: number; expiresAt: number } | null =
      proof ?? (REQUIRE_SIGNED_LICENSE_PROOF ? null : localPayload && isLocalTokenValid ? localPayload : null);
    if (!proof && REQUIRE_SIGNED_LICENSE_PROOF && localPayload) {
      this.logger.warn('Sin prueba de licencia Ed25519 válida: no se concede periodo de gracia offline hasta validar online.');
    }

    if (gracePayload) {
      // 2.1 Verificación dura de expiración: Si la fecha del token o licencia ya expiró, EXPIRED sin excepciones
      if (now >= gracePayload.expiresAt) {
        this.licenseStatus = 'EXPIRED';
        this.activePlan = undefined;
        const msg = 'El periodo de prueba de la Beta ha finalizado. La sincronización se ha detenido.';
        this.logger.warn(`Licencia expirada (${new Date(gracePayload.expiresAt).toISOString()}). Deteniendo sincronización.`);
        this.eventBus?.addEvent('error', msg);
        return { status: 'EXPIRED', message: msg };
      }

      // 2.2 Límite estricto de desconexión para Beta/Trial (máx 48h offline sin contacto con el servidor)
      const planStr = String(gracePayload.plan || '').toLowerCase();
      const isBetaOrTrial = planStr.includes('trial') || planStr.includes('beta');
      if (isBetaOrTrial) {
        if (this.lastOnlineTimestamp === 0) {
          this.lastOnlineTimestamp = await this.secureStore.loadLastOnlineTimestamp(hwid);
        }
        const lastOnline = this.lastOnlineTimestamp || gracePayload.issuedAt;
        const offlineMs = now - lastOnline;
        const MAX_BETA_OFFLINE_MS = 48 * 60 * 60 * 1000;

        if (offlineMs > MAX_BETA_OFFLINE_MS) {
          this.licenseStatus = 'EXPIRED';
          this.activePlan = undefined;
          const msg = 'La licencia Beta requiere validación online cada 48 horas. Conecte el equipo a internet para reanudar la sincronización.';
          this.logger.warn(`Límite offline superado en Beta (>48h sin contacto con el servidor). Bloqueando sincronización.`);
          this.eventBus?.addEvent('error', msg);
          return { status: 'EXPIRED', message: msg };
        }
      }

      this.licenseStatus = 'GRACE_PERIOD';
      this.activePlan = gracePayload.plan;
      this.tokenExpiresAt = gracePayload.expiresAt;
      const remainingHours = Math.round((gracePayload.expiresAt - now) / 3600000);
      this.logger.warn(`Operando en período de gracia offline (${remainingHours}h restantes). Plan: ${gracePayload.plan}`);
      return { status: 'GRACE_PERIOD', plan: gracePayload.plan };
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
    await this.secureStore.deleteLicenseProof();
    this.configManager.setLicenseKey(undefined);
    this.licenseStatus = 'UNLICENSED';
    this.activePlan = undefined;
    this.tokenExpiresAt = 0;
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

  public checkHealth(): { healthy: boolean; status: AgentLicenseStatus; lastSeenTimestamp: number; plan?: string } {
    const now = Date.now();
    if (this.lastSeenTimestamp > 0 && now < this.lastSeenTimestamp) {
      this.logger.error(`Manipulación de reloj detectada en checkHealth: ${now} < ${this.lastSeenTimestamp}`);
      this.licenseStatus = 'EXPIRED';
      this.activePlan = undefined;
      this.eventBus?.addEvent('error', 'Manipulación de reloj detectada en comprobación de salud.');
      return { healthy: false, status: 'EXPIRED', lastSeenTimestamp: this.lastSeenTimestamp };
    }
    this.lastSeenTimestamp = Math.max(this.lastSeenTimestamp, now);
    return {
      healthy: this.licenseStatus === 'VALID' || this.licenseStatus === 'GRACE_PERIOD',
      status: this.licenseStatus,
      lastSeenTimestamp: this.lastSeenTimestamp,
      plan: this.activePlan,
    };
  }

  public getLastSeenTimestamp(): number {
    return this.lastSeenTimestamp;
  }

  public setLastSeenTimestamp(ts: number): void {
    this.lastSeenTimestamp = ts;
  }
}
