import fs from 'fs';
import path from 'path';
import { FactusolDetectedInstance, Logger } from '@erp-bridge/shared';

export class FactusolDetector {
  private static readonly logger = new Logger('FactusolDetector');

  private static getStandardDirectories(): string[] {
    const dirs: string[] = [];
    const driveLetters = ['C', 'D', 'E', 'F', 'G', 'Z', 'Y', 'X'];

    for (const drive of driveLetters) {
      dirs.push(
        `${drive}:\\Software DELSOL\\Factusol\\Datos\\FS`,
        `${drive}:\\Software DELSOL\\Factusol\\Datos`,
        `${drive}:\\Software DELSOL\\FACTUSOL\\Datos\\FS`,
        `${drive}:\\Software DELSOL\\FACTUSOL\\Datos`,
        `${drive}:\\Program Files\\Software DELSOL\\Factusol\\Datos\\FS`,
        `${drive}:\\Program Files (x86)\\Software DELSOL\\Factusol\\Datos\\FS`,
        `${drive}:\\Factusol\\Datos\\FS`,
        `${drive}:\\Factusol\\Datos`,
        `${drive}:\\DELSOL\\Factusol\\Datos\\FS`,
        `${drive}:\\DELSOL\\Factusol\\Datos`
      );
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
    return dirs;
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
