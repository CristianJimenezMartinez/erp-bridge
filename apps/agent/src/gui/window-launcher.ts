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
  // Soporte de mock para pruebas automatizadas y CI/CD
  if (process.env['BENTIAN_MOCK_FILE_DIALOG'] !== undefined) {
    const mockVal = process.env['BENTIAN_MOCK_FILE_DIALOG'];
    logger.info(`[MOCK/TEST] openWindowsFileDialog simulado: ${mockVal || '(CANCEL)'}`);
    return mockVal === 'CANCEL' ? '' : mockVal;
  }

  if (process.env['HEADLESS'] === 'true') {
    logger.info('[HEADLESS] openWindowsFileDialog ignorado en entorno sin cabeza.');
    return '';
  }

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
      path.resolve(process.cwd(), 'apps', 'agent', 'src', 'gui', 'tray', 'BentianTray.exe'),
      path.resolve(process.cwd(), 'apps', 'agent', 'dist', 'gui', 'tray', 'BentianTray.exe'),
    ];

    for (const trayExe of trayCandidates) {
      if (fs.existsSync(trayExe)) {
        logger.info(`Abriendo selector nativo de Windows mediante: ${trayExe}`);
        const output = childProcess.execFileSync(trayExe, ['--open-file-dialog'], {
          encoding: 'utf8',
          timeout: 120000,
          windowsHide: false,
        });
        // Si el ejecutable se ejecutó sin errores, el diálogo fue mostrado al usuario.
        // Si seleccionó archivo devolvemos la ruta; si canceló, retornamos cadena vacía
        // inmediatamente sin caer en el fallback de PowerShell para no abrir una segunda ventana.
        return output ? output.trim() : '';
      }
    }
  } catch (trayErr) {
    logger.warn('Aviso al invocar BentianTray dialog, usando fallback de PowerShell:', { err: String(trayErr) });
  }

  // 2. Fallback mediante PowerShell nativo en modo STA con ventana TopMost y UTF-8
  try {
    logger.info('Invocando selector nativo mediante fallback PowerShell (TopMost = true, UTF-8)...');
    const psScript = [
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
      'Add-Type -AssemblyName System.Windows.Forms;',
      '$f = New-Object System.Windows.Forms.Form;',
      '$f.TopMost = $true;',
      '$f.StartPosition = "Manual";',
      '$f.Location = New-Object System.Drawing.Point(-32000, -32000);',
      '$f.Size = New-Object System.Drawing.Size(1, 1);',
      '$f.ShowInTaskbar = $false;',
      '$f.Show();',
      '$f.BringToFront();',
      '$d = New-Object System.Windows.Forms.OpenFileDialog;',
      `$d.Title = '${title.replace(/'/g, "''")}';`,
      `$d.Filter = '${filter.replace(/'/g, "''")}|Todos los archivos (*.*)|*.*';`,
      '$d.CheckFileExists = $true;',
      '$d.RestoreDirectory = $true;',
      'if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($d.FileName) };',
      '$d.Dispose();',
      '$f.Dispose();'
    ].join(' ');

    const output = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', psScript], {
      encoding: 'utf8',
      timeout: 120000,
      windowsHide: false,
    });
    if (output && output.trim()) {
      return output.trim();
    }
  } catch (psErr) {
    logger.warn('Fallo o timeout al invocar OpenFileDialog de PowerShell:', { err: String(psErr) });
  }

  return '';
}
