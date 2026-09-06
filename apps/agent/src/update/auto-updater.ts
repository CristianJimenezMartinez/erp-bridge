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
   * Queries the Core API to check if a new version is available for this Agent.
   */
  public async checkForUpdate(channel: 'stable' | 'beta' | 'critical' = 'stable'): Promise<UpdateCheckResponse> {
    const payload: UpdateCheckRequest = {
      agentId: this.config.agentId,
      currentVersion: this.config.currentVersion,
      platform: os.platform(),
      arch: os.arch(),
      channel,
    };

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/updates/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { available: false };
      }

      const json = (await res.json()) as { data: UpdateCheckResponse };
      return json.data;
    } catch (err) {
      this.logger.warn(`Error al consultar actualizaciones: ${String(err)}`);
      return { available: false };
    }
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
  public async applyUpdate(newBinaryPath: string, targetBinaryPath?: string): Promise<void> {
    if (!fs.existsSync(newBinaryPath)) {
      throw new Error(`El archivo de actualización no existe: ${newBinaryPath}`);
    }

    const targetExe = targetBinaryPath || process.execPath;
    this.logger.info(`Aplicando actualización atómica sobre: ${targetExe}`);

    if (process.platform === 'win32') {
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

      // 5. Lanzar nuevo proceso desacoplado si estamos corriendo como ejecutable
      const isCompiledExe = targetExe.toLowerCase().endsWith('.exe') && !targetExe.toLowerCase().includes('node.exe');
      if (isCompiledExe) {
        this.logger.info('🚀 Lanzando nueva versión desacoplada (detached)...');
        const child = childProcess.spawn(targetExe, ['start', '--post-update'], {
          detached: true,
          stdio: 'ignore',
          cwd: targetDir,
        });
        child.unref();

        this.logger.info('👋 Proceso anterior finalizado exitosamente para liberar recursos.');
        process.exit(0);
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
  public async rollback(targetBinaryPath?: string): Promise<void> {
    const targetExe = targetBinaryPath || process.execPath;
    const oldExePath = `${targetExe}.old`;

    if (fs.existsSync(oldExePath)) {
      try {
        if (fs.existsSync(targetExe)) {
          try { fs.unlinkSync(targetExe); } catch {}
        }
        fs.renameSync(oldExePath, targetExe);
        this.logger.warn(`⏪ Rollback completado. Restaurada versión previa desde: ${oldExePath}`);

        await this.reportStatus(this.config.currentVersion, 'rollback', 'Fallo en comprobación post-actualización');

        if (process.platform === 'win32' && targetExe.toLowerCase().endsWith('.exe')) {
          const child = childProcess.spawn(targetExe, ['start'], {
            detached: true,
            stdio: 'ignore',
            cwd: path.dirname(targetExe),
          });
          child.unref();
          process.exit(1);
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
