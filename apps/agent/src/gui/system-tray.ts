import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('SystemTray');

export class SystemTrayManager {
  private static instance: childProcess.ChildProcess | null = null;

  /**
   * Localiza o compila el ejecutable BentianTray.exe nativo de Windows.
   */
  public static ensureTrayExecutable(): string | null {
    if (process.platform !== 'win32') {
      return null;
    }

    const execDir = path.dirname(process.execPath);
    const candidatePaths = [
      path.join(__dirname, 'tray', 'BentianTray.exe'),
      path.join(__dirname, 'BentianTray.exe'),
      path.join(execDir, 'BentianTray.exe'),
      path.resolve(process.cwd(), 'builder', 'dist', 'BentianTray.exe'),
      path.resolve(process.cwd(), 'apps', 'agent', 'dist', 'gui', 'tray', 'BentianTray.exe'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Si no existe compilado, lo compilamos dinámicamente con csc.exe del sistema
    const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
    if (fs.existsSync(cscPath)) {
      const csSource = path.resolve(__dirname, 'tray', 'BentianTray.cs');
      const csFallback = path.resolve(process.cwd(), 'apps', 'agent', 'src', 'gui', 'tray', 'BentianTray.cs');
      const sourcePath = fs.existsSync(csSource) ? csSource : csFallback;

      if (fs.existsSync(sourcePath)) {
        const targetExe = path.join(path.dirname(sourcePath), 'BentianTray.exe');
        const iconPath = path.resolve(process.cwd(), 'apps', 'dashboard', 'src-tauri', 'icons', 'icon.ico');
        const iconFlag = fs.existsSync(iconPath) ? `/win32icon:"${iconPath}"` : '';

        try {
          logger.info('Compilando BentianTray.exe nativo con csc.exe...');
          const cmd = `"${cscPath}" /target:winexe ${iconFlag} /out:"${targetExe}" /r:System.Windows.Forms.dll /r:System.Drawing.dll "${sourcePath}"`;
          childProcess.execSync(cmd, { stdio: 'ignore' });
          if (fs.existsSync(targetExe)) {
            logger.info(`✓ BentianTray.exe compilado con éxito en: ${targetExe}`);
            return targetExe;
          }
        } catch (err) {
          logger.warn('No se pudo compilar dinámicamente BentianTray.exe:', { error: String(err) });
        }
      }
    }

    return null;
  }

  /**
   * Inicia el icono del System Tray en Windows en segundo plano.
   */
  public static start(port: number, cloudUrl = 'https://api.veltiatrust.com/dashboard/'): boolean {
    if (process.platform !== 'win32') {
      return false;
    }

    if (this.instance && !this.instance.killed) {
      return true; // Ya está en ejecución
    }

    const trayExe = this.ensureTrayExecutable();
    if (!trayExe) {
      logger.warn('No se pudo localizar BentianTray.exe. El System Tray no se iniciará.');
      return false;
    }

    try {
      const args = [
        '--port', String(port),
        '--parent-pid', String(process.pid),
        '--cloud-url', cloudUrl,
      ];

      const child = childProcess.spawn(trayExe, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });

      child.unref();
      this.instance = child;

      logger.info(`✓ System Tray de Windows activo junto al reloj (PID: ${child.pid})`);
      return true;
    } catch (err) {
      logger.warn('Error al iniciar el System Tray:', { error: String(err) });
      return false;
    }
  }

  /**
   * Detiene el proceso del System Tray si está activo.
   */
  public static stop(): void {
    if (this.instance && !this.instance.killed) {
      try {
        this.instance.kill();
      } catch { }
      this.instance = null;
    }
  }
}
