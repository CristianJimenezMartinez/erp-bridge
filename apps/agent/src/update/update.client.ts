import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import {
  Logger,
  UpdateCheckRequest,
  UpdateCheckResponse,
  UpdateConfirmRequest,
  UpdateChannel,
} from '@erp-bridge/shared';
import { EventBus } from '../diagnostics/event-bus';
import {
  DownloadProgress,
  PendingUpdate,
  UpdateClientState,
  UpdateOptions,
} from './update.types';
import { UpdateVerifier } from './update.verifier';
import { UpdateSwapper } from './update.swapper';

export class UpdateClient {
  private readonly logger = new Logger('UpdateClient');
  private readonly tempDir: string;
  private readonly backupDir: string;

  private state: UpdateClientState;
  private checkTimer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private isDownloading = false;
  private isApplying = false;
  private lastReportedPercent = -1;

  constructor(
    private readonly options: UpdateOptions,
    private readonly eventBus?: EventBus
  ) {
    const baseDir =
      process.env.APPDATA ||
      (os.platform() === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    this.tempDir = options.tempDir || path.join(baseDir, 'erp-bridge', 'updates_temp');
    this.backupDir = options.backupDir || path.join(baseDir, 'erp-bridge', 'backup');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.state = {
      status: 'idle',
      currentVersion: options.currentVersion,
      pendingUpdate: null,
      lastCheckedAt: null,
      lastError: null,
      downloadProgress: null,
    };
  }

  /**
   * Obtiene una copia del estado actual del cliente de actualización.
   */
  public getStatus(): UpdateClientState {
    return { ...this.state };
  }

  /**
   * Emite eventos en el EventBus del agente y en el feed de logs de diagnóstico.
   */
  private emitUpdateEvent(
    eventType: 'update:available' | 'update:downloading' | 'update:ready' | 'update:failed',
    data: any
  ): void {
    if (this.eventBus) {
      this.eventBus.emit(eventType, data);

      switch (eventType) {
        case 'update:available':
          this.eventBus.addEvent('info', `🔥 Nueva actualización disponible: v${data.version}`);
          break;
        case 'update:downloading':
          if (data.percentage % 25 === 0 && data.percentage !== this.lastReportedPercent) {
            this.lastReportedPercent = data.percentage;
            this.eventBus.addEvent('info', `⬇️ Descargando actualización v${data.version}: ${data.percentage}%`);
          }
          break;
        case 'update:ready':
          this.eventBus.addEvent('success', `✓ Actualización v${data.version} lista para instalar`);
          break;
        case 'update:failed':
          this.eventBus.addEvent('error', `❌ Error en actualización: ${data.error}`);
          break;
      }
    }
  }

  /**
   * Compara dos versiones SemVer. Retorna true si remoteVer es estrictamente mayor que localVer.
   */
  private isNewer(remoteVer: string, localVer: string): boolean {
    const rBase = (remoteVer.replace(/^v/, '').split('-')[0] ?? '0.0.0').split('.');
    const lBase = (localVer.replace(/^v/, '').split('-')[0] ?? '0.0.0').split('.');
    const cleanR = rBase.map((x) => parseInt(x, 10) || 0);
    const cleanL = lBase.map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < 3; i++) {
      const r = cleanR[i] ?? 0;
      const l = cleanL[i] ?? 0;
      if (r > l) return true;
      if (r < l) return false;
    }
    return false;
  }

  /**
   * Inicia el ciclo periódico de comprobación en segundo plano.
   */
  public startPeriodicCheck(intervalMs?: number): void {
    this.stopPeriodicCheck();
    const interval = intervalMs ?? this.options.checkIntervalMs ?? 60 * 60 * 1000; // Por defecto 1 hora

    // Comprobación inicial
    void this.checkForUpdates();

    this.checkTimer = setInterval(() => {
      void this.checkForUpdates();
    }, interval);

    this.logger.info(`Ciclo de auto-actualización en segundo plano iniciado (intervalo: ${interval / 1000}s)`);
  }

  /**
   * Detiene el ciclo periódico de comprobación.
   */
  public stopPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Consulta a la API central si existe una nueva versión compatible.
   */
  public async checkForUpdates(channel?: UpdateChannel): Promise<UpdateCheckResponse> {
    if (this.isChecking || this.isDownloading || this.isApplying) {
      return { available: false };
    }

    this.isChecking = true;
    this.state.status = 'checking';
    this.state.lastError = null;

    const chosenChannel = channel || this.options.channel || 'stable';
    const payload: UpdateCheckRequest = {
      agentId: this.options.agentId,
      currentVersion: this.options.currentVersion,
      platform: os.platform(),
      arch: os.arch(),
      channel: chosenChannel,
    };

    try {
      this.logger.info(`Comprobando actualizaciones contra ${this.options.apiBaseUrl}...`);
      const checkUrl = `${this.options.apiBaseUrl.replace(/\/$/, '')}/api/v1/updates/check`;

      let checkData: UpdateCheckResponse = { available: false };

      try {
        const res = await fetch(checkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });

        this.state.lastCheckedAt = new Date();

        if (res.ok) {
          const json = (await res.json()) as { data?: UpdateCheckResponse; available?: boolean };
          checkData = (json.data || json) as UpdateCheckResponse;
        }
      } catch (apiErr) {
        this.logger.debug(`API /updates/check no respondió: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}. Consultando fallback CDN...`);
      }

      // Fallback de alta resiliencia: Si la API no reportó actualización o falló, verificar releases/latest.json directamente en Caddy/Nginx
      if (!checkData.available || !checkData.version) {
        try {
          const staticUrl = `${this.options.apiBaseUrl.replace(/\/$/, '')}/releases/latest.json`;
          const staticRes = await fetch(staticUrl, { signal: AbortSignal.timeout(6000) });
          if (staticRes.ok) {
            const staticJson = (await staticRes.json()) as any;
            const manifest = staticJson.stable || staticJson;
            if (manifest && manifest.version && this.isNewer(manifest.version, this.options.currentVersion)) {
              checkData = {
                available: true,
                version: manifest.version,
                downloadUrl: manifest.downloadUrl,
                sha256: manifest.sha256,
                signature: manifest.signature,
                fileSize: manifest.fileSize,
                releaseNotes: manifest.releaseNotes,
                mandatory: manifest.mandatory,
                channel: manifest.channel || chosenChannel,
              };
            }
          }
        } catch (staticErr) {
          this.logger.debug(`Fallback CDN apiBaseUrl no disponible: ${staticErr instanceof Error ? staticErr.message : String(staticErr)}`);
        }
      }

      // Fallback canónico oficial: Si el host local o de tienda no tiene latest.json, consultar el CDN central de Bentian
      if (!checkData.available || !checkData.version) {
        const canonicalBase = 'https://bridge.cristianjm.com';
        if (this.options.apiBaseUrl.replace(/\/$/, '') !== canonicalBase) {
          try {
            const canonRes = await fetch(`${canonicalBase}/releases/latest.json`, { signal: AbortSignal.timeout(6000) });
            if (canonRes.ok) {
              const canonJson = (await canonRes.json()) as any;
              const manifest = canonJson.stable || canonJson;
              if (manifest && manifest.version && this.isNewer(manifest.version, this.options.currentVersion)) {
                checkData = {
                  available: true,
                  version: manifest.version,
                  downloadUrl: manifest.downloadUrl,
                  sha256: manifest.sha256,
                  signature: manifest.signature,
                  fileSize: manifest.fileSize,
                  releaseNotes: manifest.releaseNotes,
                  mandatory: manifest.mandatory,
                  channel: manifest.channel || chosenChannel,
                };
              }
            }
          } catch {}
        }
      }

      if (checkData.available && checkData.version && checkData.downloadUrl && checkData.sha256 && checkData.signature) {
        const pending: PendingUpdate = {
          version: checkData.version,
          downloadUrl: checkData.downloadUrl,
          sha256: checkData.sha256,
          signature: checkData.signature,
          fileSize: checkData.fileSize,
          releaseNotes: checkData.releaseNotes,
          mandatory: checkData.mandatory,
          channel: checkData.channel || chosenChannel,
        };

        this.state.status = 'available';
        this.state.pendingUpdate = pending;

        this.emitUpdateEvent('update:available', pending);

        if (this.options.autoDownload) {
          void this.downloadUpdate(pending);
        }

        return checkData;
      } else {
        this.state.status = 'idle';
        this.state.pendingUpdate = null;
        return { available: false };
      }
    } catch (err: any) {
      const errorMsg = String(err?.message || err);
      this.logger.warn(`Aviso al consultar actualizaciones: ${errorMsg}`);
      this.state.status = 'failed';
      this.state.lastError = errorMsg;
      this.emitUpdateEvent('update:failed', { error: errorMsg });
      return { available: false };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Descarga el archivo de actualización de forma resumable con seguimiento de progreso en streaming.
   */
  public async downloadUpdate(targetUpdate?: PendingUpdate): Promise<string> {
    const update = targetUpdate || this.state.pendingUpdate;
    if (!update) {
      throw new Error('No hay ninguna actualización pendiente para descargar.');
    }

    if (this.isDownloading) {
      this.logger.info('Descarga ya en curso. Esperando finalización...');
      while (this.isDownloading) {
        await new Promise((r) => setTimeout(r, 500));
      }
      return update.downloadedFilePath || path.join(this.tempDir, `BentianAgent-v${update.version}.new.exe`);
    }

    this.isDownloading = true;
    this.state.status = 'downloading';
    this.lastReportedPercent = -1;

    const destFileName = `BentianAgent-v${update.version}.new.exe`;
    const destFilePath = path.join(this.tempDir, destFileName);
    const partFilePath = `${destFilePath}.part`;

    const fullUrl = update.downloadUrl.startsWith('http')
      ? update.downloadUrl
      : `${this.options.apiBaseUrl.replace(/\/$/, '')}/${update.downloadUrl.replace(/^\//, '')}`;

    try {
      let existingBytes = 0;
      if (fs.existsSync(partFilePath)) {
        existingBytes = fs.statSync(partFilePath).size;
      }

      const headers: Record<string, string> = {};
      if (existingBytes > 0) {
        headers['Range'] = `bytes=${existingBytes}-`;
        this.logger.info(`Reanudando descarga de v${update.version} desde byte ${existingBytes}...`);
      } else {
        this.logger.info(`Iniciando descarga de actualización v${update.version} desde ${fullUrl}...`);
      }

      let res = await fetch(fullUrl, { headers });

      // Si el servidor devuelve 416 Range Not Satisfiable, reiniciar la descarga desde cero
      if (res.status === 416) {
        this.logger.warn('Rango no válido (416). Reiniciando descarga completa...');
        if (fs.existsSync(partFilePath)) fs.unlinkSync(partFilePath);
        existingBytes = 0;
        res = await fetch(fullUrl);
      }

      if (!res.ok) {
        throw new Error(`Fallo en descarga: HTTP ${res.status} ${res.statusText}`);
      }

      const isPartial = res.status === 206;
      const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      const totalBytes = isPartial ? existingBytes + contentLength : (contentLength || update.fileSize || 0);

      let downloadedBytes = isPartial ? existingBytes : 0;
      const writeStream = fs.createWriteStream(partFilePath, { flags: isPartial ? 'a' : 'w' });

      if (res.body) {
        const nodeStream = Readable.fromWeb(res.body as any);

        for await (const chunk of nodeStream) {
          writeStream.write(chunk);
          downloadedBytes += (chunk as Buffer).length;
          const percentage = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

          const progress: DownloadProgress = {
            bytesDownloaded: downloadedBytes,
            totalBytes,
            percentage,
          };

          this.state.downloadProgress = progress;
          update.downloadProgress = percentage;

          this.emitUpdateEvent('update:downloading', {
            version: update.version,
            ...progress,
          });
        }
      } else {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        writeStream.write(buf);
        downloadedBytes += buf.length;
      }

      await new Promise<void>((resolve, reject) => {
        writeStream.end((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Mover el archivo .part al archivo binario final
      if (fs.existsSync(destFilePath)) {
        fs.unlinkSync(destFilePath);
      }
      fs.renameSync(partFilePath, destFilePath);

      this.logger.info(`Descarga completada en: ${destFilePath} (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);

      // Verificación de seguridad inmediata tras la descarga
      this.logger.info('Verificando integridad SHA-256 y firma criptográfica...');
      const verification = UpdateVerifier.verifyBinary(
        destFilePath,
        update.sha256,
        update.signature,
        this.options.publicKeyPem,
        this.options.hmacSecret
      );

      if (!verification.valid) {
        const errorReason = verification.reason || 'Fallo de verificación criptográfica';
        this.logger.error(`Seguridad de actualización vulnerada: ${errorReason}`);
        try { fs.unlinkSync(destFilePath); } catch {}
        throw new Error(errorReason);
      }

      update.downloadedFilePath = destFilePath;
      this.state.status = 'ready';
      this.state.pendingUpdate = update;

      this.emitUpdateEvent('update:ready', {
        version: update.version,
        filePath: destFilePath,
        sha256: verification.calculatedSha256,
      });

      if (this.options.autoApply && !this.isApplying) {
        void this.applyUpdate(update);
      }

      return destFilePath;
    } catch (err: any) {
      const errorMsg = String(err?.message || err);
      this.state.status = 'failed';
      this.state.lastError = errorMsg;
      this.emitUpdateEvent('update:failed', { version: update.version, error: errorMsg });
      throw err;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Ejecuta el reemplazo atómico en Windows deteniendo procesos, renombrando a .bak y monitorizando 10s.
   */
  public async applyUpdate(targetUpdate?: PendingUpdate): Promise<{ success: boolean; message: string }> {
    const update = targetUpdate || this.state.pendingUpdate;
    if (!update) {
      return { success: false, message: 'No hay ninguna actualización pendiente para aplicar.' };
    }

    if (!update.downloadedFilePath || !fs.existsSync(update.downloadedFilePath)) {
      if (this.isDownloading) {
        this.logger.info('Esperando a que concluya la descarga en segundo plano...');
        while (this.isDownloading) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } else {
        this.logger.info('El binario aún no está descargado. Descargando automáticamente antes de aplicar...');
        try {
          await this.downloadUpdate(update);
        } catch (err) {
          return { success: false, message: `Fallo al descargar actualización: ${String(err)}` };
        }
      }
    }

    if (this.isApplying) {
      return { success: false, message: 'La actualización ya se está aplicando.' };
    }

    this.isApplying = true;
    this.state.status = 'applying';

    const newBinaryPath = update.downloadedFilePath!;
    const targetBinaryPath = this.options.targetBinaryPath || process.execPath;

    this.logger.info(`Aplicando actualización v${update.version} de forma segura sobre: ${targetBinaryPath}`);

    try {
      // Si estamos en entorno ejecutable en Windows
      if (process.platform === 'win32') {
        const result = UpdateSwapper.launchAtomicUpdateProcess({
          targetExePath: targetBinaryPath,
          newExePath: newBinaryPath,
          timeoutSeconds: 10,
          processNamesToKill: ['BentianAgent', 'BentianTray'],
          postUpdateArgs: ['start', '--post-update', '--minimized'],
        });

        this.logger.info(`✓ Proceso atómico de reemplazo iniciado: ${result.batPath}`);
        this.logger.info('Cerrando proceso actual para ceder el control al script de swap...');

        setTimeout(() => {
          process.exit(0);
        }, 800);

        return {
          success: true,
          message: `Actualización iniciada. El agente se reiniciará en la versión v${update.version}.`,
        };
      } else {
        // En plataformas no-windows o entornos de prueba
        const swap = await UpdateSwapper.performDirectSwap(targetBinaryPath, newBinaryPath);
        if (!swap.success) {
          throw new Error(swap.error || 'Error al reemplazar binario');
        }
        this.state.status = 'success';
        return { success: true, message: `Binario actualizado a v${update.version} con éxito.` };
      }
    } catch (err: any) {
      const errorMsg = String(err?.message || err);
      this.logger.error(`Error al aplicar la actualización: ${errorMsg}`);
      this.state.status = 'failed';
      this.state.lastError = errorMsg;
      this.emitUpdateEvent('update:failed', { version: update.version, error: errorMsg });
      await this.reportStatus(update.version, 'failed', errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      this.isApplying = false;
    }
  }

  /**
   * Notifica a la API central el resultado final de la actualización (success, rollback o failed).
   */
  public async reportStatus(toVersion: string, status: 'success' | 'rollback' | 'failed', errorMessage?: string): Promise<void> {
    const payload: UpdateConfirmRequest = {
      agentId: this.options.agentId,
      fromVersion: this.options.currentVersion,
      toVersion,
      status,
      errorMessage,
    };

    try {
      const confirmUrl = `${this.options.apiBaseUrl.replace(/\/$/, '')}/api/v1/updates/confirm`;
      await fetch(confirmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.logger.info(`Reporte de confirmación enviado a Core: ${status} (v${toVersion})`);
    } catch (err) {
      this.logger.warn(`No se pudo enviar el reporte de confirmación: ${String(err)}`);
    }
  }
}
