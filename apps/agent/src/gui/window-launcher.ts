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

/**
 * Lanza la interfaz de Bentian Agent en una ventana nativa de escritorio
 * sin barra de direcciones ni pestañas (modo cromeless app).
 */
export function openDesktopWindow(url: string): boolean {
  try {
    const browserExe = findBrowserAppExecutable();
    const windowArgs = [
      `--app=${url}`,
      '--window-size=1120,780',
      '--app-id=BentianAgent',
      '--disable-extensions',
      '--no-default-browser-check',
    ];

    if (browserExe) {
      logger.info(`Lanzando ventana de escritorio nativa con: ${browserExe}`);
      const child = childProcess.spawn(browserExe, windowArgs, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
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
 * Abre el diálogo nativo de Windows (OpenFileDialog) para seleccionar un archivo.
 */
export function openWindowsFileDialog(title: string, filter: string): string {
  if (process.platform !== 'win32') {
    return '';
  }
  try {
    const escapedTitle = title.replace(/'/g, "''");
    const escapedFilter = filter.replace(/'/g, "''");
    const psCmd = `Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Filter = '${escapedFilter}'; $dialog.Title = '${escapedTitle}'; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.FileName }`;
    const res = childProcess.execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8' }).trim();
    return res;
  } catch {
    return '';
  }
}
