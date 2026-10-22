import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as childProcess from 'child_process';
import { Logger } from '@erp-bridge/shared';
import { UpdateSwapOptions } from './update.types';
import {
  buildBatchSwapScript,
  buildPowerShellSwapScript,
  resolveDefaultUpdateScriptDir,
} from './update-script.builder';

export class UpdateSwapper {
  private static readonly logger = new Logger('UpdateSwapper');

  /**
   * Genera el script de PowerShell nativo para el swap atómico y monitorización de 10 segundos.
   */
  public static generatePowerShellScript(options: UpdateSwapOptions): string {
    return buildPowerShellSwapScript(options);
  }

  /**
   * Genera el script .bat ejecutable directamente por Windows CMD sin restricciones de política.
   */
  public static generateBatchScript(options: UpdateSwapOptions, ps1Path?: string): string {
    return buildBatchSwapScript(options, ps1Path);
  }

  /**
   * Escribe los scripts atómicos (.bat y .ps1) en el directorio indicado.
   */
  public static writeAtomicScripts(options: UpdateSwapOptions): {
    batPath: string;
    ps1Path: string;
  } {
    const scriptDir = resolveDefaultUpdateScriptDir(options.scriptDir);
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }

    const ps1Path = path.join(scriptDir, 'bentian-apply-update.ps1');
    const batPath = path.join(scriptDir, 'bentian-apply-update.bat');

    const ps1Content = this.generatePowerShellScript(options);
    const batContent = this.generateBatchScript(options, ps1Path);

    // Escribir con BOM UTF-8 (\uFEFF) para compatibilidad nativa con PowerShell 5.1
    fs.writeFileSync(ps1Path, '\uFEFF' + ps1Content, { encoding: 'utf8' });
    fs.writeFileSync(batPath, batContent, { encoding: 'utf8' });

    this.logger.info(`Scripts de actualización generados:\n  - ${batPath}\n  - ${ps1Path}`);
    return { batPath, ps1Path };
  }

  /**
   * SHA-256 (hex) de un archivo, o cadena vacía si no se puede leer.
   */
  private static tryComputeSha256(filePath: string): string {
    try {
      return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(filePath))).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Lanza el script de actualización desacoplado de Windows para que se ejecute fuera del proceso actual.
   */
  public static launchAtomicUpdateProcess(rawOptions: UpdateSwapOptions): { launched: boolean; batPath: string } {
    // SEGURIDAD (TOCTOU): se fija el SHA-256 del binario nuevo en el momento de lanzar (el llamador ya
    // lo verificó contra el manifiesto firmado). El script lo reverifica sobre una copia protegida.
    const options: UpdateSwapOptions = {
      ...rawOptions,
      expectedSha256: rawOptions.expectedSha256 || this.tryComputeSha256(rawOptions.newExePath),
    };
    const { batPath } = this.writeAtomicScripts(options);

    this.logger.info(`Lanzando proceso desacoplado de actualización atómica: ${batPath}`);

    if (process.platform === 'win32') {
      const targetDir = path.dirname(path.resolve(options.targetExePath));
      let needsElevation = false;

      // Comprobar si tenemos permisos de escritura en la carpeta del ejecutable (ej: C:\Program Files)
      try {
        const testFile = path.join(targetDir, `.bentian_perm_test_${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch {
        needsElevation = true;
      }

      if (needsElevation) {
        this.logger.info(`Ruta de destino protegida (${targetDir}). Elevando proceso de actualización mediante UAC de Windows...`);
        // El script viaja en la propia línea de comandos del proceso elevado (-EncodedCommand): no existe
        // ningún archivo en %TEMP% que pueda ser sustituido entre la petición UAC y su ejecución.
        const encodedScript = Buffer.from(this.generatePowerShellScript(options), 'utf16le').toString('base64');
        const child = childProcess.spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-EncodedCommand','${encodedScript}' -Verb RunAs -WindowStyle Hidden`,
          ],
          {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          }
        );
        child.unref();
        return { launched: true, batPath };
      }

      const child = childProcess.spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        cwd: path.dirname(batPath),
      });
      child.unref();
      return { launched: true, batPath };
    }

    return { launched: false, batPath };
  }

  /**
   * Reemplazo directo en el sistema de archivos (útil para tests unitarios y rollback programático).
   */
  public static async performDirectSwap(
    targetExe: string,
    newExe: string,
    backupExe?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(newExe)) {
        return { success: false, error: `El archivo nuevo no existe: ${newExe}` };
      }

      const bak = backupExe || `${targetExe}.bak`;
      if (fs.existsSync(targetExe)) {
        if (fs.existsSync(bak)) {
          fs.unlinkSync(bak);
        }
        fs.renameSync(targetExe, bak);
      }

      fs.copyFileSync(newExe, targetExe);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Rollback directo en el sistema de archivos restaurando el archivo .bak.
   */
  public static async performDirectRollback(
    targetExe: string,
    backupExe?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bak = backupExe || `${targetExe}.bak`;
      if (!fs.existsSync(bak)) {
        return { success: false, error: `El archivo de respaldo .bak no existe: ${bak}` };
      }

      if (fs.existsSync(targetExe)) {
        try {
          fs.unlinkSync(targetExe);
        } catch {}
      }

      fs.renameSync(bak, targetExe);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
