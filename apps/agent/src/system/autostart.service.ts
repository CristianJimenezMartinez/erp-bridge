import os from 'os';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { Logger } from '@erp-bridge/shared';

export interface AutoStartServiceOptions {
  platform?: NodeJS.Platform;
  appName?: string;
  execPath?: string;
  appDataDir?: string;
}

export class AutoStartService {
  private readonly logger = new Logger('AutoStartService');
  private readonly platform: NodeJS.Platform;
  private readonly appName: string;
  private readonly customExecPath?: string;
  private readonly appDataDir?: string;

  private readonly registryKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  private readonly cimSubKey = 'Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  private readonly hDefKeyHKCU = 2147483649; // 0x80000001 (HKEY_CURRENT_USER in WMI/CIM StdRegProv)

  constructor(options?: AutoStartServiceOptions) {
    this.platform = options?.platform ?? process.platform;
    this.appName = options?.appName ?? 'BentianAgent';
    this.customExecPath = options?.execPath;
    this.appDataDir = options?.appDataDir;
  }

  /**
   * Comprueba si el arranque automático está habilitado en Windows.
   * Verifica la clave de registro HKCU\Software\Microsoft\Windows\CurrentVersion\Run
   * o el acceso directo en el directorio Startup del usuario.
   * Retorna false de forma defensiva en sistemas que no sean Windows.
   */
  public async isEnabled(): Promise<boolean> {
    if (this.platform !== 'win32') {
      return false;
    }

    try {
      // 1. Verificar acceso directo en carpeta Inicio (%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup)
      const shortcutPath = this.getStartupShortcutPath();
      if (fs.existsSync(shortcutPath)) {
        return true;
      }

      // 2. Verificar en Registro con reg.exe
      const regExists = await this.queryRegistryRunKey();
      if (regExists) {
        return true;
      }

      // 3. Fallback: Verificar vía PowerShell CIM
      const cimExists = await this.queryRegistryRunKeyViaCim();
      return cimExists;
    } catch (err) {
      this.logger.warn('Error al verificar estado de arranque automático en Windows:', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Habilita el arranque automático en Windows registrando el ejecutable con el flag --minimized.
   * Retorna false de forma defensiva si no está en Windows.
   */
  public async enable(): Promise<boolean> {
    if (this.platform !== 'win32') {
      this.logger.info(`Auto-arranque ignorado: plataforma ${this.platform} no soportada.`);
      return false;
    }

    try {
      const startupCmd = this.getStartupCommand();
      this.logger.info(`Configurando auto-arranque en Windows para ${this.appName}: ${startupCmd}`);

      // 1. Intentar registrar con reg.exe nativo
      const regSuccess = await this.setRegistryRunKey(startupCmd);
      if (regSuccess) {
        this.logger.info(`✓ Auto-arranque registrado con éxito en HKCU\\...\\Run para ${this.appName}`);
        return true;
      }

      // 2. Fallback: Registrar vía PowerShell CIM
      this.logger.warn('reg.exe falló, intentando registrar mediante PowerShell CIM...');
      const cimSuccess = await this.setRegistryRunKeyViaCim(startupCmd);
      if (cimSuccess) {
        this.logger.info(`✓ Auto-arranque registrado vía PowerShell CIM para ${this.appName}`);
        return true;
      }

      this.logger.error('No se pudo registrar la clave de auto-arranque en Windows (ambos métodos fallaron).');
      return false;
    } catch (err) {
      this.logger.error('Excepción al habilitar arranque automático en Windows:', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Deshabilita el arranque automático eliminando la clave de registro y cualquier acceso directo en Startup.
   * Retorna false de forma defensiva si no está en Windows.
   */
  public async disable(): Promise<boolean> {
    if (this.platform !== 'win32') {
      return false;
    }

    try {
      this.logger.info(`Deshabilitando auto-arranque en Windows para ${this.appName}...`);

      // 1. Eliminar acceso directo en Startup si existe
      const shortcutPath = this.getStartupShortcutPath();
      if (fs.existsSync(shortcutPath)) {
        try {
          fs.unlinkSync(shortcutPath);
          this.logger.info(`✓ Acceso directo eliminado de Inicio: ${shortcutPath}`);
        } catch (unlinkErr) {
          this.logger.warn(`Aviso: No se pudo eliminar archivo shortcut: ${String(unlinkErr)}`);
        }
      }

      // 2. Eliminar clave de registro mediante reg.exe
      const regDeleted = await this.deleteRegistryRunKey();
      if (regDeleted) {
        this.logger.info(`✓ Clave de registro eliminada con éxito para ${this.appName}`);
        return true;
      }

      // 3. Fallback: Eliminar mediante PowerShell CIM
      const cimDeleted = await this.deleteRegistryRunKeyViaCim();
      if (cimDeleted) {
        this.logger.info(`✓ Clave de registro eliminada vía PowerShell CIM para ${this.appName}`);
        return true;
      }

      return true;
    } catch (err) {
      this.logger.error('Excepción al deshabilitar arranque automático en Windows:', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Obtiene la ruta del ejecutable o script actual de forma robusta.
   */
  public getExecutablePath(): string {
    if (this.customExecPath) {
      return this.customExecPath;
    }

    // 1. Si no es node/ts-node, estamos en un binario nativo empaquetado (SEA, pkg, etc.)
    const execBase = path.basename(process.execPath).toLowerCase().replace(/\.exe$/i, '');
    const isNode = execBase === 'node' || execBase === 'ts-node';
    if (!isNode) {
      return process.execPath;
    }

    // 2. En Windows, buscar si existe el ejecutable compilado/instalado
    const localAppData =
      this.appDataDir ||
      process.env['LOCALAPPDATA'] ||
      (process.env['USERPROFILE'] ? path.join(process.env['USERPROFILE'], 'AppData', 'Local') : '');

    if (localAppData) {
      const installedExe = path.join(localAppData, 'Programs', 'Bentian Agent', 'BentianAgent.exe');
      if (fs.existsSync(installedExe)) {
        return installedExe;
      }
    }

    // 3. Buscar binario en builder/dist si estamos en el repositorio
    const repoDistExe = path.resolve(process.cwd(), 'builder', 'dist', 'BentianAgent.exe');
    if (fs.existsSync(repoDistExe)) {
      return repoDistExe;
    }

    // 4. Si se ejecuta como script con Node (node dist/cli.js o ts-node src/cli.ts)
    if (process.argv && process.argv[1]) {
      const scriptPath = path.resolve(process.argv[1]);
      if (fs.existsSync(scriptPath)) {
        return scriptPath;
      }
    }

    return process.execPath;
  }

  /**
   * Genera el comando de arranque con comillas de seguridad y flag --minimized.
   */
  public getStartupCommand(): string {
    const exePath = this.getExecutablePath();
    const execBase = path.basename(process.execPath).toLowerCase().replace(/\.exe$/i, '');
    const isNode = execBase === 'node' || execBase === 'ts-node';

    if (isNode && /\.(?:c?js|ts)$/i.test(exePath)) {
      return `"${process.execPath}" "${exePath}" --minimized`;
    }

    return `"${exePath}" --minimized`;
  }

  /**
   * Obtiene la ruta del archivo de acceso directo en el directorio Inicio de Windows.
   */
  public getStartupShortcutPath(): string {
    const roaming =
      this.appDataDir ||
      process.env['APPDATA'] ||
      (os.homedir() ? path.join(os.homedir(), 'AppData', 'Roaming') : '');
    return path.join(roaming, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${this.appName}.lnk`);
  }

  // --- Helpers de Ejecución y Registro ---

  private queryRegistryRunKey(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        'reg.exe',
        ['query', this.registryKey, '/v', this.appName],
        { windowsHide: true, timeout: 5000 },
        (err, stdout) => {
          if (!err && stdout && stdout.includes(this.appName)) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
    });
  }

  private setRegistryRunKey(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        'reg.exe',
        ['add', this.registryKey, '/v', this.appName, '/t', 'REG_SZ', '/d', command, '/f'],
        { windowsHide: true, timeout: 5000 },
        (err) => {
          if (!err) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
    });
  }

  private deleteRegistryRunKey(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        'reg.exe',
        ['delete', this.registryKey, '/v', this.appName, '/f'],
        { windowsHide: true, timeout: 5000 },
        () => {
          resolve(true);
        }
      );
    });
  }

  private queryRegistryRunKeyViaCim(): Promise<boolean> {
    return new Promise((resolve) => {
      const psScript = `
        try {
          $res = Invoke-CimMethod -Namespace root\\default -ClassName StdRegProv -MethodName GetStringValue -Arguments @{
            hDefKey = [uint32]${this.hDefKeyHKCU};
            sSubKeyName = '${this.cimSubKey}';
            sValueName = '${this.appName}'
          };
          if ($res.ReturnValue -eq 0 -and [string]::IsNullOrEmpty($res.sValue) -eq $false) {
            exit 0;
          } else {
            exit 1;
          }
        } catch {
          exit 1;
        }
      `.trim();

      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { windowsHide: true, timeout: 7000 },
        (err) => {
          resolve(!err);
        }
      );
    });
  }

  private setRegistryRunKeyViaCim(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const escapedCmd = command.replace(/'/g, "''");
      const psScript = `
        try {
          $res = Invoke-CimMethod -Namespace root\\default -ClassName StdRegProv -MethodName SetStringValue -Arguments @{
            hDefKey = [uint32]${this.hDefKeyHKCU};
            sSubKeyName = '${this.cimSubKey}';
            sValueName = '${this.appName}';
            sValue = '${escapedCmd}'
          };
          if ($res.ReturnValue -eq 0) {
            exit 0;
          } else {
            exit 1;
          }
        } catch {
          exit 1;
        }
      `.trim();

      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { windowsHide: true, timeout: 7000 },
        (err) => {
          resolve(!err);
        }
      );
    });
  }

  private deleteRegistryRunKeyViaCim(): Promise<boolean> {
    return new Promise((resolve) => {
      const psScript = `
        try {
          $res = Invoke-CimMethod -Namespace root\\default -ClassName StdRegProv -MethodName DeleteValue -Arguments @{
            hDefKey = [uint32]${this.hDefKeyHKCU};
            sSubKeyName = '${this.cimSubKey}';
            sValueName = '${this.appName}'
          };
          exit 0;
        } catch {
          exit 0;
        }
      `.trim();

      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { windowsHide: true, timeout: 7000 },
        () => {
          resolve(true);
        }
      );
    });
  }
}
