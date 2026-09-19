import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';
import {
  Logger,
  UpdateCheckRequest,
  UpdateCheckResponse,
  UpdateConfirmRequest,
  UpdateStatus,
} from '@erp-bridge/shared';
import { UpdateVerifier } from './update-verifier';

export interface AutoUpdaterConfig {
  apiBaseUrl: string;
  agentId: string;
  currentVersion: string;
  publicKeyPem?: string;
  tempDir?: string;
  backupDir?: string;
}

export class AutoUpdater {
  private readonly logger = new Logger('AutoUpdater');
  private readonly tempDir: string;
  private readonly backupDir: string;

  constructor(private config: AutoUpdaterConfig) {
    const baseDir = process.env.APPDATA || (os.platform() === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
    this.tempDir = config.tempDir || path.join(baseDir, 'erp-bridge', 'updates_temp');
    this.backupDir = config.backupDir || path.join(baseDir, 'erp-bridge', 'backup');
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
   * Queries the Core API to check if a new version is available for this Agent.
   * Cuenta con fallback multi-nivel a releases/latest.json y CDN canónico oficial.
   */
  public async checkForUpdate(channel: 'stable' | 'beta' | 'critical' = 'stable'): Promise<UpdateCheckResponse> {
    const payload: UpdateCheckRequest = {
      agentId: this.config.agentId,
      currentVersion: this.config.currentVersion,
      platform: os.platform(),
      arch: os.arch(),
      channel,
    };

    let checkData: UpdateCheckResponse = { available: false };

    try {
      const res = await fetch(`${this.config.apiBaseUrl.replace(/\/$/, '')}/api/v1/updates/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = (await res.json()) as { data?: UpdateCheckResponse; available?: boolean };
        checkData = (json.data || json) as UpdateCheckResponse;
      }
    } catch (err) {
      this.logger.debug(`API /updates/check no respondió: ${String(err)}. Consultando fallback CDN...`);
    }

    // Fallback 1: releases/latest.json en apiBaseUrl
    if (!checkData.available || !checkData.version) {
      try {
        const staticUrl = `${this.config.apiBaseUrl.replace(/\/$/, '')}/releases/latest.json`;
        const staticRes = await fetch(staticUrl, { signal: AbortSignal.timeout(6000) });
        if (staticRes.ok) {
          const staticJson = (await staticRes.json()) as any;
          const manifest = staticJson.stable || staticJson;
          if (manifest && manifest.version && this.isNewer(manifest.version, this.config.currentVersion)) {
            checkData = {
              available: true,
              version: manifest.version,
              downloadUrl: manifest.downloadUrl,
              sha256: manifest.sha256,
              signature: manifest.signature,
              fileSize: manifest.fileSize,
              releaseNotes: manifest.releaseNotes,
              mandatory: manifest.mandatory,
              channel: manifest.channel || channel,
            };
          }
        }
      } catch (staticErr) {
        this.logger.debug(`Fallback CDN apiBaseUrl no disponible: ${String(staticErr)}`);
      }
    }

    // Fallback 2: CDN canónico oficial de Bentian (https://bridge.cristianjm.com)
    if (!checkData.available || !checkData.version) {
      const canonicalBase = 'https://bridge.cristianjm.com';
      if (this.config.apiBaseUrl.replace(/\/$/, '') !== canonicalBase) {
        try {
          const canonRes = await fetch(`${canonicalBase}/releases/latest.json`, { signal: AbortSignal.timeout(6000) });
          if (canonRes.ok) {
            const canonJson = (await canonRes.json()) as any;
            const manifest = canonJson.stable || canonJson;
            if (manifest && manifest.version && this.isNewer(manifest.version, this.config.currentVersion)) {
              checkData = {
                available: true,
                version: manifest.version,
                downloadUrl: manifest.downloadUrl,
                sha256: manifest.sha256,
                signature: manifest.signature,
                fileSize: manifest.fileSize,
                releaseNotes: manifest.releaseNotes,
                mandatory: manifest.mandatory,
                channel: manifest.channel || channel,
              };
            }
          }
        } catch {}
      }
    }

    return checkData;
  }

  /**
   * Downloads an update binary into the temporary updates directory.
   */
  public async downloadUpdate(downloadUrl: string, version: string): Promise<string> {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    const destFileName = `agent-v${version}.exe`;
    const destFilePath = path.join(this.tempDir, destFileName);

    const fullUrl = downloadUrl.startsWith('http')
      ? downloadUrl
      : `${this.config.apiBaseUrl.replace(/\/$/, '')}/${downloadUrl.replace(/^\//, '')}`;

    this.logger.info(`Descargando actualización v${version} desde ${fullUrl}...`);

    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`Error en la descarga: HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destFilePath, buffer);

    this.logger.info(`✓ Actualización descargada exitosamente en: ${destFilePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    return destFilePath;
  }

  /**
   * Verifies the cryptographic integrity and Ed25519 signature of the downloaded update file.
   */
  public verifyUpdate(filePath: string, expectedSHA256: string, signature: string): boolean {
    const verification = UpdateVerifier.verifyBinary(filePath, expectedSHA256, signature, this.config.publicKeyPem);
    if (!verification.valid) {
      this.logger.error(`Fallo en la verificación de seguridad de la actualización: ${verification.reason}`);
      return false;
    }
    this.logger.info('✓ Integridad SHA-256 y firma digital Ed25519 verificadas con éxito.');
    return true;
  }

  /**
   * Creates a backup copy of the currently running binary before applying an update.
   */
  public async backupCurrentBinary(currentBinaryPath: string): Promise<string> {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const backupPath = path.join(this.backupDir, `agent-backup-v${this.config.currentVersion}.bak`);
    if (fs.existsSync(currentBinaryPath)) {
      fs.copyFileSync(currentBinaryPath, backupPath);
      this.logger.info(`Copia de seguridad creada en: ${backupPath}`);
    }
    return backupPath;
  }

  /**
   * Replaces the running binary with the new updated version using NTFS atomic rename.
   * On Windows, running .exe files are locked against overwriting by the kernel,
   * but NTFS permits renaming them on the same volume. We rename to .old,
   * copy the new binary, launch the new version detached, and exit cleanly.
   */
  public async applyUpdate(newBinaryPath: string, targetBinaryPath?: string, launchNew: boolean = true): Promise<void> {
    if (!fs.existsSync(newBinaryPath)) {
      throw new Error(`El archivo de actualización no existe: ${newBinaryPath}`);
    }

    const targetExe = targetBinaryPath || process.execPath;
    this.logger.info(`Aplicando actualización atómica sobre: ${targetExe}`);

    if (process.platform === 'win32') {
      const isCompiledExe =
        !targetBinaryPath &&
        targetExe.toLowerCase().endsWith('.exe') &&
        !targetExe.toLowerCase().includes('node.exe') &&
        process.env.NODE_ENV !== 'test' &&
        launchNew;

      if (isCompiledExe) {
        this.logger.info('🚀 Ejecutable compilado en Windows detectado. Lanzando proceso atómico de actualización con UpdateSwapper (con soporte UAC si es necesario)...');
        try {
          const { UpdateSwapper } = require('./update.swapper');
          const result = UpdateSwapper.launchAtomicUpdateProcess({
            targetExePath: targetExe,
            newExePath: newBinaryPath,
            timeoutSeconds: 10,
            processNamesToKill: ['BentianAgent', 'BentianTray'],
            postUpdateArgs: ['start', '--post-update'],
          });
          this.logger.info(`✓ Proceso atómico iniciado: ${result.batPath}. Cerrando proceso actual para reemplazo.`);
          setTimeout(() => {
            process.exit(0);
          }, 800);
          return;
        } catch (swapErr) {
          this.logger.warn(`Aviso con UpdateSwapper: ${String(swapErr)}. Intentando método directo como fallback.`);
        }
      }

      const oldExePath = `${targetExe}.old`;

      // 1. Si existe un .old residual previo, eliminarlo
      if (fs.existsSync(oldExePath)) {
        try {
          fs.unlinkSync(oldExePath);
        } catch (e) {
          this.logger.warn(`Aviso al eliminar .old previo: ${String(e)}`);
        }
      }

      // 2. Renombrar el ejecutable bloqueado actual a .old (permitido por NTFS)
      if (fs.existsSync(targetExe)) {
        try {
          fs.renameSync(targetExe, oldExePath);
          this.logger.info(`✓ Ejecutable actual renombrado temporalmente a: ${oldExePath}`);
        } catch (renameErr) {
          this.logger.warn(`No se pudo renombrar a .old (${String(renameErr)}). Intentando sobrescritura directa.`);
        }
      }

      // 3. Copiar el nuevo binario a la ruta oficial ahora liberada
      fs.copyFileSync(newBinaryPath, targetExe);
      this.logger.info(`✓ Nuevo binario copiado exitosamente en: ${targetExe}`);

      // 4. Copiar adodb.js si está presente junto a la nueva release
      const newDir = path.dirname(newBinaryPath);
      const targetDir = path.dirname(targetExe);
      const newAdodb = path.join(newDir, 'adodb.js');
      const targetAdodb = path.join(targetDir, 'adodb.js');
      if (fs.existsSync(newAdodb) && newAdodb !== targetAdodb) {
        try {
          fs.copyFileSync(newAdodb, targetAdodb);
        } catch {}
      }
    } else {
      fs.copyFileSync(newBinaryPath, targetExe);
      this.logger.info(`✓ Archivo ejecutable actualizado exitosamente: ${targetExe}`);
    }
  }

  /**
   * Executed during startup to verify post-update health, clean up .old backup, and report success.
   */
  public async handlePostUpdate(targetBinaryPath?: string): Promise<boolean> {
    const targetExe = targetBinaryPath || process.execPath;
    const oldExePath = `${targetExe}.old`;

    if (!fs.existsSync(oldExePath)) {
      return true;
    }

    this.logger.info(`Detectada versión previa de actualización (${oldExePath}). Limpiando y confirmando salud...`);
    try {
      fs.unlinkSync(oldExePath);
      this.logger.info(`✓ Archivo de respaldo .old eliminado correctamente.`);
      await this.reportStatus(this.config.currentVersion, 'success');
      return true;
    } catch (err) {
      this.logger.warn(`Aviso en limpieza post-actualización: ${String(err)}`);
      return false;
    }
  }

  /**
   * Restores the previous binary in case of critical health check failure.
   */
  public async rollback(targetOrBackupPath?: string, maybeTargetBinaryPath?: string): Promise<void> {
    let backupPath: string;
    let targetExe: string;

    if (maybeTargetBinaryPath) {
      backupPath = targetOrBackupPath!;
      targetExe = maybeTargetBinaryPath;
    } else if (targetOrBackupPath && (targetOrBackupPath.endsWith('.bak') || targetOrBackupPath.endsWith('.old'))) {
      backupPath = targetOrBackupPath;
      targetExe = targetOrBackupPath.replace(/\.(bak|old)$/, '');
    } else {
      targetExe = targetOrBackupPath || process.execPath;
      backupPath = fs.existsSync(`${targetExe}.bak`) ? `${targetExe}.bak` : `${targetExe}.old`;
    }

    if (fs.existsSync(backupPath)) {
      try {
        if (fs.existsSync(targetExe)) {
          try { fs.unlinkSync(targetExe); } catch {}
        }
        fs.copyFileSync(backupPath, targetExe);
        this.logger.warn(`⏪ Rollback completado. Restaurada versión previa desde: ${backupPath}`);

        await this.reportStatus(this.config.currentVersion, 'rollback', 'Fallo en comprobación post-actualización');

        if (process.platform === 'win32' && !maybeTargetBinaryPath && targetExe.toLowerCase().endsWith('.exe') && !targetExe.toLowerCase().includes('node.exe') && process.env.NODE_ENV !== 'test') {
          try {
            const child = childProcess.spawn(targetExe, ['start'], {
              detached: true,
              stdio: 'ignore',
              cwd: path.dirname(targetExe),
            });
            child.unref();
            process.exit(1);
          } catch (spawnErr) {
            this.logger.warn(`Aviso al relanzar en rollback: ${String(spawnErr)}`);
          }
        }
      } catch (err) {
        this.logger.error(`Error crítico ejecutando rollback: ${String(err)}`);
      }
    }
  }

  /**
   * Reports the final update execution status (success, rollback, or failed) back to the Core API.
   */
  public async reportStatus(toVersion: string, status: UpdateStatus, errorMessage?: string): Promise<void> {
    const payload: UpdateConfirmRequest = {
      agentId: this.config.agentId,
      fromVersion: this.config.currentVersion,
      toVersion,
      status,
      errorMessage,
    };

    try {
      await fetch(`${this.config.apiBaseUrl}/api/v1/updates/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.logger.info(`Reporte de actualización enviado al Core: ${status} (v${toVersion})`);
    } catch (err) {
      this.logger.warn(`No se pudo enviar el reporte de actualización al Core: ${String(err)}`);
    }
  }
}
