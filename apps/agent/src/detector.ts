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
        `${drive}:\\Factusol\\Datos\\FS`,
        `${drive}:\\Factusol\\Datos`
      );
    }

    dirs.push(process.cwd());
    return dirs;
  }

  public static detectAll(additionalPaths: string[] = []): FactusolDetectedInstance[] {
    const detected: FactusolDetectedInstance[] = [];
    const searchDirs = [...new Set([...additionalPaths, ...this.getStandardDirectories()])];

    this.logger.info('Escaneando directorios en busca de bases de datos Factusol (.accdb / .mdb)...');

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.accdb' || ext === '.mdb') {
              const fullPath = path.join(dir, entry.name);
              const stats = fs.statSync(fullPath);

              // Ignorar archivos de bloqueo temporales (.laccdb / archivos < 100 KB)
              if (stats.size < 100 * 1024) continue;

              const { companyCode, year } = this.parseFileName(entry.name);

              detected.push({
                databasePath: fullPath,
                companyCode,
                year,
                fileSizeBytes: stats.size,
                lastModified: stats.mtime,
                isValid: true,
              });

              this.logger.info(`✓ Factusol detectado: ${fullPath} (Empresa: ${companyCode || 'N/A'}, Ejercicio: ${year || 'N/A'})`);
            }
          } else if (entry.isDirectory() && entry.name.toUpperCase() === 'FS') {
            // Escanear subcarpeta FS común en Factusol
            const subFsDir = path.join(dir, entry.name);
            try {
              const fsEntries = fs.readdirSync(subFsDir, { withFileTypes: true });
              for (const subEntry of fsEntries) {
                if (subEntry.isFile()) {
                  const ext = path.extname(subEntry.name).toLowerCase();
                  if (ext === '.accdb' || ext === '.mdb') {
                    const fullPath = path.join(subFsDir, subEntry.name);
                    const stats = fs.statSync(fullPath);
                    if (stats.size < 100 * 1024) continue;

                    const { companyCode, year } = this.parseFileName(subEntry.name);
                    detected.push({
                      databasePath: fullPath,
                      companyCode,
                      year,
                      fileSizeBytes: stats.size,
                      lastModified: stats.mtime,
                      isValid: true,
                    });
                    this.logger.info(`✓ Factusol detectado en /FS: ${fullPath} (Empresa: ${companyCode || 'N/A'}, Ejercicio: ${year || 'N/A'})`);
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

    // Ordenar por año descendente (2025 > 2024) para priorizar el ejercicio fiscal más reciente
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
