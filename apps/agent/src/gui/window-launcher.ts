import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('WindowLauncher');

/**
 * Validates that a target URL is strictly HTTP/HTTPS and free of shell metacharacters
 * before passing it to browser launchers or OS URL handlers.
 */
export function sanitizeDesktopWindowUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (/["'`$&|;<>\\\r\n\x00-\x1f\x7f]/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function findBrowserAppExecutable(): string | null {
  const localAppData = process.env['LOCALAPPDATA'] || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidatePaths = [
    // 1. Microsoft Edge (prioridad #1 en Windows 10/11: ventana aislada nativa de escritorio independiente)
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),

    // 2. Google Chrome (fallback para modo app nativo)
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),

    // 3. Brave Browser
    path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
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
 * Lanza la interfaz de Bentian Agent en una ventana nativa de escritorio exclusiva
 * sin barra de direcciones, sin pestañas y con marco de aplicación independiente.
 */
export function openDesktopWindow(url: string): boolean {
  const safeUrl = sanitizeDesktopWindowUrl(url);
  if (!safeUrl) {
    logger.warn('URL rechazada por seguridad en openDesktopWindow:', { url });
    return false;
  }

  if (process.env['HEADLESS'] === 'true') {
    logger.info(`Modo headless/test activo: apertura de ventana simulada para ${safeUrl}`);
    return true;
  }

  const now = Date.now();
  if (now - lastOpenedAt < 1000) {
    logger.info(`Apertura de ventana ignorada: anti-duplicados activo (${now - lastOpenedAt}ms desde la anterior).`);
    return true;
  }
  lastOpenedAt = now;

  try {
    if (process.platform === 'win32') {
      const browserExe = findBrowserAppExecutable();
      if (browserExe) {
        try {
          logger.info(`Lanzando ventana de escritorio nativa independiente con: ${browserExe}`);
          const child = childProcess.spawn(
            browserExe,
            [`--app=${safeUrl}`, '--new-window', '--window-size=1180,820'],
            {
              detached: true,
              stdio: 'ignore',
            }
          );
          child.unref();
          return true;
        } catch (spawnErr) {
          logger.warn('Fallo al invocar modo app en browserExe:', { err: String(spawnErr) });
        }
      }

      logger.info('Abriendo interfaz de Bentian en el navegador del usuario...');
      childProcess.execFile('cmd.exe', ['/c', 'start', '', safeUrl], { windowsHide: true });
      return true;
    } else if (process.platform === 'darwin') {
      childProcess.execFile('open', [safeUrl]);
      return true;
    } else {
      childProcess.execFile('xdg-open', [safeUrl]);
      return true;
    }
  } catch (err) {
    logger.warn('No se pudo lanzar automáticamente la ventana gráfica:', { err: String(err) });
    return false;
  }
}

/**
 * Abre el selector nativo de archivos de Windows (OpenFileDialog).
 * Permite examinar la Red, unidades asignadas y rutas UNC hacia el NAS (ej: \\NAS\...).
 */
export async function openWindowsFileDialog(
  title = 'Seleccionar Base de Datos Factusol (Local o NAS)',
  filter = 'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb',
  initialPath?: string
): Promise<string> {
  if (process.env['BENTIAN_MOCK_FILE_DIALOG'] !== undefined) {
    const mockVal = process.env['BENTIAN_MOCK_FILE_DIALOG'];
    logger.info(`[MOCK/TEST] openWindowsFileDialog simulado: ${mockVal || '(CANCEL)'}`);
    return mockVal === 'CANCEL' ? '' : mockVal;
  }

  if (process.env['HEADLESS'] === 'true' || process.platform !== 'win32') {
    return '';
  }

  const cleanInitialPath = initialPath ? String(initialPath).replace(/[\x00-\x1f\x7f]/g, '').trim() : undefined;

  // 1. Intentar mediante BentianTray.exe --open-file-dialog [initialPath] (solo rutas de confianza)
  try {
    const execDir = path.dirname(process.execPath);
    const repoRootFromModule = path.resolve(__dirname, '../../../..');
    const trayCandidates = [
      path.join(execDir, 'BentianTray.exe'),
      path.join(__dirname, 'tray', 'BentianTray.exe'),
      path.join(__dirname, 'BentianTray.exe'),
      path.join(repoRootFromModule, 'builder', 'dist', 'BentianTray.exe'),
    ];

    const foundTrayExe = trayCandidates.find((candidate) => fs.existsSync(candidate)) || null;

    if (foundTrayExe) {
      logger.info(`Abriendo selector nativo de Windows mediante: ${foundTrayExe}`);
      const args = ['--open-file-dialog'];
      if (cleanInitialPath) {
        args.push(cleanInitialPath);
      }

      const output = await new Promise<string | null>((resolve) => {
        childProcess.execFile(
          foundTrayExe,
          args,
          { encoding: 'utf8', timeout: 120000, windowsHide: false },
          (err, stdout) => {
            if (err) {
              logger.warn('Aviso al invocar BentianTray dialog, usando fallback de PowerShell:', { err: String(err) });
              resolve(null);
            } else {
              resolve(stdout ? stdout.trim() : '');
            }
          }
        );
      });

      if (output !== null) {
        return output;
      }
    }
  } catch (trayErr) {
    logger.warn('Aviso al invocar BentianTray dialog, usando fallback de PowerShell:', { err: String(trayErr) });
  }

  // 2. Fallback mediante PowerShell nativo en modo STA con ventana TopMost y UTF-8 (-EncodedCommand)
  try {
    logger.info('Invocando selector nativo mediante fallback PowerShell (TopMost = true, UTF-8)...');

    const safeTitle = String(title || '').replace(/[\x00-\x1f\x7f]/g, '').replace(/'/g, "''");
    const safeFilter = String(filter || '').replace(/[\x00-\x1f\x7f]/g, '').replace(/'/g, "''");

    let initialDirPs = '';
    if (cleanInitialPath) {
      const sanitizedInitial = cleanInitialPath.replace(/'/g, "''");
      initialDirPs = `$initPath = '${sanitizedInitial}'; if (Test-Path $initPath -PathType Leaf) { $d.InitialDirectory = [System.IO.Path]::GetDirectoryName($initPath); $d.FileName = [System.IO.Path]::GetFileName($initPath); } elseif (Test-Path $initPath -PathType Container) { $d.InitialDirectory = $initPath; };`;
    } else {
      initialDirPs = `foreach ($p in @('C:\\Software DELSOL\\Factusol\\Datos\\FS', 'C:\\Factusol\\Datos\\FS')) { if (Test-Path $p) { $d.InitialDirectory = $p; break; } };`;
    }

    const psScript = [
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
      'Add-Type -AssemblyName System.Windows.Forms;',
      '$f = New-Object System.Windows.Forms.Form;',
      '$f.ShowInTaskbar = $false;',
      '$f.WindowState = [System.Windows.Forms.FormWindowState]::Minimized;',
      '$f.TopMost = $true;',
      '$null = $f.Handle;',
      '$d = New-Object System.Windows.Forms.OpenFileDialog;',
      `$d.Title = '${safeTitle}';`,
      `$d.Filter = '${safeFilter}|Todos los archivos (*.*)|*.*';`,
      '$d.CheckFileExists = $true;',
      '$d.RestoreDirectory = $true;',
      '$d.AutoUpgradeEnabled = $true;',
      initialDirPs,
      '$res = $d.ShowDialog($f);',
      'if ($res -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($d.FileName) };',
      '$d.Dispose();',
      '$f.Dispose();',
    ].join(' ');

    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

    const output = await new Promise<string>((resolve) => {
      childProcess.execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encodedCommand],
        { encoding: 'utf8', timeout: 120000, windowsHide: true },
        (err, stdout) => {
          if (err) {
            logger.warn('Fallo o timeout al invocar OpenFileDialog de PowerShell:', { err: String(err) });
            resolve('');
          } else {
            resolve(stdout ? stdout.trim() : '');
          }
        }
      );
    });

    if (output && output.trim()) {
      return output.trim();
    }
  } catch (psErr) {
    logger.warn('Fallo o timeout al invocar OpenFileDialog de PowerShell:', { err: String(psErr) });
  }

  return '';
}
