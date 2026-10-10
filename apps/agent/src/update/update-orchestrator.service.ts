import fs from 'fs';
import { performance } from 'perf_hooks';
import { Logger } from '@erp-bridge/shared';
import { AutoUpdater, VERSION_REGEX } from './auto-updater';
import { UpdateClient } from './update.client';
import { AgentDiskLogger } from '../diagnostics/disk-logger';

export interface UpdateOrchestratorOptions {
  autoUpdater: AutoUpdater;
  updateClient: UpdateClient;
  getCurrentVersion: () => string;
}

export class UpdateOrchestratorService {
  private readonly logger = new Logger('UpdateOrchestrator');
  private readonly autoUpdater: AutoUpdater;
  private readonly updateClient: UpdateClient;
  private readonly getCurrentVersion: () => string;
  private isUpdating = false;

  constructor(options: UpdateOrchestratorOptions) {
    this.autoUpdater = options.autoUpdater;
    this.updateClient = options.updateClient;
    this.getCurrentVersion = options.getCurrentVersion;
  }

  public getIsUpdating(): boolean {
    return this.isUpdating;
  }

  public async applyUpdateFromInfo(info: {
    version: string;
    downloadUrl?: string;
    sha256?: string;
    signature?: string;
  }): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;
    const tUpdateStart = performance.now();

    if (!info.version || !VERSION_REGEX.test(info.version)) {
      this.logger.error(`Versión de actualización sospechosa o no válida: "${info.version}". Rechazando actualización.`);
      this.isUpdating = false;
      return;
    }

    const currentVersion = this.getCurrentVersion();
    if (!this.autoUpdater.isNewer(info.version, currentVersion)) {
      this.logger.warn(`Versión de actualización v${info.version} no es superior a la versión actual v${currentVersion}. Rechazando posible intento de downgrade.`);
      this.isUpdating = false;
      return;
    }

    let downloadedFile: string | null = null;
    try {
      let { downloadUrl, sha256, signature } = info;
      if (!downloadUrl || !sha256 || !signature) {
        const check = await this.autoUpdater.checkForUpdate();
        if (!check.available || !check.downloadUrl || !check.sha256 || !check.signature) {
          this.isUpdating = false;
          return;
        }
        downloadUrl = check.downloadUrl;
        sha256 = check.sha256;
        signature = check.signature;
      }

      this.logger.info(`Iniciando auto-actualización silenciosa hacia v${info.version}...`);
      const tDownloadStart = performance.now();
      downloadedFile = await this.autoUpdater.downloadUpdate(downloadUrl, info.version);
      const downloadMs = Math.round(performance.now() - tDownloadStart);

      const tVerifyStart = performance.now();
      const isValid = this.autoUpdater.verifyUpdate(downloadedFile, sha256, signature);
      const verifyMs = Math.round(performance.now() - tVerifyStart);

      if (!isValid) {
        if (downloadedFile && fs.existsSync(downloadedFile)) {
          try { fs.unlinkSync(downloadedFile); } catch {}
        }
        this.logger.error(`Firma o integridad inválida para v${info.version}. Actualización rechazada de forma segura.`);
        await this.autoUpdater.reportStatus(info.version, 'failed', 'Fallo de verificación criptográfica Ed25519');
        AgentDiskLogger.getInstance().log({
          level: 'ERROR',
          component: 'AutoUpdater',
          action: 'apply_update',
          duration_ms: Math.round(performance.now() - tUpdateStart),
          status: 'FAILURE',
          message: `Firma criptográfica inválida para v${info.version}`,
        });
        this.isUpdating = false;
        return;
      }

      this.logger.info(`✓ Verificación criptográfica exitosa. Aplicando reemplazo atómico en Windows...`);
      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS',
        component: 'AutoUpdater',
        action: 'apply_update',
        duration_ms: Math.round(performance.now() - tUpdateStart),
        status: 'SUCCESS',
        message: `Actualización a v${info.version} descargada (${downloadMs}ms) y verificada (${verifyMs}ms). Iniciando reemplazo.`,
        metadata: { version: info.version, downloadMs, verifyMs },
      });
      await this.autoUpdater.applyUpdate(downloadedFile, undefined, true, sha256);
    } catch (err) {
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        try { fs.unlinkSync(downloadedFile); } catch {}
      }
      this.logger.error(`Error durante el ciclo de actualización automática: ${String(err)}`);
      await this.autoUpdater.reportStatus(info.version, 'failed', String(err));
      this.isUpdating = false;
    }
  }

  public async checkForUpdatesAndApply(): Promise<void> {
    if (this.isUpdating) return;
    try {
      const check = await this.updateClient.checkForUpdates();
      if (check.available && check.version && check.downloadUrl && check.sha256 && check.signature) {
        this.logger.info(`Nueva versión detectada al iniciar: v${check.version}`);
        await this.updateClient.applyUpdate();
      }
    } catch (err) {
      this.logger.warn(`Aviso en comprobación inicial de actualizaciones: ${String(err)}`);
    }
  }
}
