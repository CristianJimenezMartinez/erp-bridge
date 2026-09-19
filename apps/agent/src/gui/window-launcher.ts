import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('WindowLauncher');

export function findBrowserAppExecutable(): string | null {
  const localAppData = process.env['LOCALAPPDATA'] || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidatePaths = [
    // 1. Microsoft Edge (presente en 100% de Windows 10/11)
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),

    // 2. Google Chrome (alternativa popular)
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

let lastOpenedAt = 0;

/**
 * Lanza la interfaz de Bentian Agent en una ventana nativa de escritorio
 * sin barra de direcciones ni pestañas (modo cromeless app).
 */
export function openDesktopWindow(url: string): boolean {
  if (process.env['HEADLESS'] === 'true') {
    logger.info(`Modo headless/test activo: apertura de ventana simulada para ${url}`);
    return true;
  }

  const now = Date.now();
  if (now - lastOpenedAt < 2500) {
    logger.info(`Apertura de ventana ignorada: anti-duplicados activo (${now - lastOpenedAt}ms desde la anterior).`);
    return true;
  }
  lastOpenedAt = now;

  try {
    const browserExe = findBrowserAppExecutable();
    if (browserExe) {
      try {
        logger.info(`Lanzando ventana de escritorio nativa con: ${browserExe}`);
        const child = childProcess.spawn(browserExe, [`--app=${url}`, '--window-size=1120,780'], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return true;
      } catch (spawnErr) {
        logger.warn('Fallo al invocar browserExe, usando fallback del sistema:', { err: String(spawnErr) });
      }
    }

    // Fallback si no se localiza ejecutable directo
    logger.info('Usando launcher del sistema para abrir la interfaz en el navegador...');
    if (process.platform === 'win32') {
      childProcess.exec(`start "" "${url}"`);
    } else if (process.platform === 'darwin') {
      childProcess.exec(`open "${url}"`);
    } else {
      childProcess.exec(`xdg-open "${url}"`);
    }
    return true;
  } catch (err) {
    logger.warn('No se pudo lanzar automáticamente la ventana gráfica:', { err: String(err) });
    return false;
  }
}

/**
 * Abre el selector nativo de archivos de Windows (OpenFileDialog).
 * Permite examinar la Red, unidades asignadas y rutas UNC hacia el NAS (ej: \\NAS\...).
 */
export function openWindowsFileDialog(title = 'Seleccionar Base de Datos Factusol (Local o NAS)', filter = 'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb'): string {
  if (process.platform !== 'win32') {
    return '';
  }

  // 1. Intentar mediante BentianTray.exe --open-file-dialog
  try {
    const execDir = path.dirname(process.execPath);
    const trayCandidates = [
      path.join(execDir, 'BentianTray.exe'),
      path.join(__dirname, 'tray', 'BentianTray.exe'),
      path.join(__dirname, 'BentianTray.exe'),
      path.resolve(process.cwd(), 'builder', 'dist', 'BentianTray.exe'),
    ];

    for (const trayExe of trayCandidates) {
      if (fs.existsSync(trayExe)) {
        const output = childProcess.execFileSync(trayExe, ['--open-file-dialog'], {
          encoding: 'utf8',
          timeout: 120000,
          windowsHide: false,
        });
        if (output && output.trim()) {
          return output.trim();
        }
      }
    }
  } catch (trayErr) {
    logger.debug('Aviso al invocar BentianTray dialog:', { err: String(trayErr) });
  }

  // 2. Fallback mediante PowerShell nativo en modo STA
  try {
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = '${title.replace(/'/g, "''")}'; $d.Filter = '${filter.replace(/'/g, "''")}|Todos los archivos (*.*)|*.*'; $d.RestoreDirectory = $true; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($d.FileName) }`;
    const output = childProcess.execSync(`powershell.exe -NoProfile -STA -Command "${psScript}"`, {
      encoding: 'utf8',
      timeout: 120000,
      windowsHide: false,
    });
    if (output && output.trim()) {
      return output.trim();
    }
  } catch (psErr) {
    logger.warn('Fallo al invocar OpenFileDialog de PowerShell:', { err: String(psErr) });
  }

  return '';
}
