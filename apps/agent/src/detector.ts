import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { FactusolDetectedInstance, Logger } from '@erp-bridge/shared';

export class FactusolDetector {
  private static readonly logger = new Logger('FactusolDetector');

  /**
   * Lee las unidades de red mapeadas de la sesión del usuario en Windows (HKCU\Network).
   * Permite descubrir letras como W:, X:, Y:, Z: incluso cuando el Agente corre elevado (UAC Admin).
   */
  public static getMappedNetworkDrives(): Array<{ letter: string; remotePath: string }> {
    if (process.platform !== 'win32') return [];
    const drives: Array<{ letter: string; remotePath: string }> = [];
    try {
      const regOut = childProcess.execFileSync('reg.exe', ['query', 'HKCU\\Network', '/s'], {
        encoding: 'utf8',
        timeout: 2000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const blocks = regOut.split(/\r?\n\r?\n/);
      for (const block of blocks) {
        const headerMatch = block.match(/HKEY_CURRENT_USER\\Network\\([A-Za-z])\b/i);
        const remoteMatch = block.match(/RemotePath\s+REG_SZ\s+([^\r\n]+)/i);
        if (headerMatch && headerMatch[1] && remoteMatch && remoteMatch[1]) {
          const letter = headerMatch[1].toUpperCase();
          const remotePath = remoteMatch[1].trim().replace(/\//g, '\\');
          if (remotePath) {
            drives.push({ letter, remotePath });
          }
        }
      }
    } catch {}
    return drives;
  }

  /**
   * Sincroniza las unidades de red mapeadas del usuario (W:, X:, Y:, Z:) en la sesión actual del proceso
   * para que aparezcan bajo "Este equipo" dentro del OpenFileDialog nativo aunque haya elevación UAC.
   */
  public static syncMappedDrivesInSession(): Array<{ letter: string; remotePath: string }> {
    const mapped = this.getMappedNetworkDrives();
    for (const { letter, remotePath } of mapped) {
      try {
        if (!fs.existsSync(`${letter}:\\`)) {
          childProcess.execFileSync('net.exe', ['use', `${letter}:`, remotePath, '/persistent:no'], {
            timeout: 1500,
            windowsHide: true,
            stdio: ['ignore', 'ignore', 'ignore'],
          });
        }
      } catch {}
    }
    return mapped;
  }

  private static getStandardDirectories(): string[] {
    const dirs: string[] = [];
    const mappedDrives = this.syncMappedDrivesInSession();
    const mappedLetters = mappedDrives.map((d) => d.letter);
    const driveLetters = [...new Set(['C', 'D', 'E', 'F', 'G', 'W', 'X', 'Y', 'Z', ...mappedLetters])];

    const pushCandidateSubdirs = (rootPath: string) => {
      const cleanRoot = rootPath.replace(/[\\/]+$/, '');
      dirs.push(
        `${cleanRoot}\\FS`,
        `${cleanRoot}`,
        `${cleanRoot}\\Datos\\FS`,
        `${cleanRoot}\\Datos`,
        `${cleanRoot}\\FACTUSOL\\Datos\\FS`,
        `${cleanRoot}\\FACTUSOL\\Datos`,
        `${cleanRoot}\\Factusol\\Datos\\FS`,
        `${cleanRoot}\\Factusol\\Datos`,
        `${cleanRoot}\\Software DELSOL\\Factusol\\Datos\\FS`,
        `${cleanRoot}\\Software DELSOL\\Factusol\\Datos`,
        `${cleanRoot}\\Software DELSOL\\FACTUSOL\\Datos\\FS`,
        `${cleanRoot}\\Software DELSOL\\FACTUSOL\\Datos`,
        `${cleanRoot}\\DELSOL\\Factusol\\Datos\\FS`,
        `${cleanRoot}\\DELSOL\\Factusol\\Datos`
      );
    };

    for (const drive of driveLetters) {
      pushCandidateSubdirs(`${drive}:`);
      dirs.push(
        `${drive}:\\Program Files\\Software DELSOL\\Factusol\\Datos\\FS`,
        `${drive}:\\Program Files (x86)\\Software DELSOL\\Factusol\\Datos\\FS`
      );
    }

    // Añadir también las rutas UNC directas de HKCU\Network (ej: \\Nas-rubio2\datos\factusol\FACTUSOL\Datos)
    for (const { remotePath } of mappedDrives) {
      pushCandidateSubdirs(remotePath);
    }

    try {
      const userHome = process.env['USERPROFILE'] || process.env['HOME'];
      if (userHome) {
        dirs.push(
          path.join(userHome, 'Documents', 'Factusol'),
          path.join(userHome, 'Desktop', 'Factusol'),
          path.join(userHome, 'Software DELSOL', 'Factusol', 'Datos', 'FS')
        );
      }
    } catch {}

    dirs.push(process.cwd());
    return [...new Set(dirs)];
  }

  private static isTemplateOrSystemFile(fileName: string): boolean {
    const base = path.basename(fileName, path.extname(fileName)).toUpperCase();
    const ignored = [
      'FACTUSOL',
      'FACTUSOLWEB',
      'GENERAL',
      'GENERALBASE',
      'GENERALCOPIA',
      'MODELOS',
      'GESTORSOL',
    ];
    if (ignored.includes(base)) return true;
    if (base.startsWith('C1') || base.endsWith('.BAK')) return true;
    return false;
  }

  public static detectAll(additionalPaths: string[] = []): FactusolDetectedInstance[] {
    const detectedMap = new Map<string, FactusolDetectedInstance>();
    const searchDirs = [...new Set([...additionalPaths, ...this.getStandardDirectories()])];

    this.logger.info('Escaneando directorios en busca de bases de datos Factusol (.accdb / .mdb)...');

    const addInstance = (fullPath: string, fileName: string) => {
      const normKey = path.resolve(fullPath).toLowerCase();
      if (detectedMap.has(normKey)) return;
      if (this.isTemplateOrSystemFile(fileName)) return;

      try {
        const stats = fs.statSync(fullPath);
        if (stats.size < 100 * 1024) return;

        const { companyCode, year } = this.parseFileName(fileName);
        detectedMap.set(normKey, {
          databasePath: fullPath,
          companyCode,
          year,
          fileSizeBytes: stats.size,
          lastModified: stats.mtime,
          isValid: true,
        });

        this.logger.info(`✓ Factusol detectado: ${fullPath} (Empresa: ${companyCode || 'N/A'}, Ejercicio: ${year || 'N/A'})`);
      } catch {}
    };

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.accdb' || ext === '.mdb') {
              addInstance(path.join(dir, entry.name), entry.name);
            }
          } else if (entry.isDirectory() && entry.name.toUpperCase() === 'FS') {
            const subFsDir = path.join(dir, entry.name);
            try {
              const fsEntries = fs.readdirSync(subFsDir, { withFileTypes: true });
              for (const subEntry of fsEntries) {
                if (subEntry.isFile()) {
                  const ext = path.extname(subEntry.name).toLowerCase();
                  if (ext === '.accdb' || ext === '.mdb') {
                    addInstance(path.join(subFsDir, subEntry.name), subEntry.name);
                  }
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        this.logger.debug(`No se pudo leer el directorio ${dir}: ${String(err)}`);
      }
    }

    const detected = Array.from(detectedMap.values());

    // Ordenar por año descendente (2026 > 2021) para priorizar el ejercicio fiscal más reciente
    detected.sort((a, b) => {
      const yearA = parseInt(a.year || '0', 10);
      const yearB = parseInt(b.year || '0', 10);
      if (yearB !== yearA) return yearB - yearA;
      return b.lastModified.getTime() - a.lastModified.getTime();
    });

    return detected;
  }

  public static getPrimaryInstance(additionalPaths: string[] = []): FactusolDetectedInstance | null {
    const all = this.detectAll(additionalPaths);
    return all.length > 0 ? all[0]! : null;
  }

  private static parseFileName(fileName: string): { companyCode?: string; year?: string } {
    const base = path.basename(fileName, path.extname(fileName));

    // Patterns:
    // 1. 3 digits company + 4 digits year: e.g. "2252025" or "0022025"
    if (/^\d{7}$/.test(base)) {
      return {
        companyCode: base.substring(0, 3),
        year: base.substring(3),
      };
    }

    // 2. Letters + year: e.g. "FS2025"
    const matchYear = base.match(/(\d{4})$/);
    if (matchYear && matchYear[1]) {
      const year = matchYear[1];
      const companyCode = base.substring(0, base.length - 4);
      return { companyCode: companyCode || undefined, year };
    }

    return { companyCode: base };
  }
}
