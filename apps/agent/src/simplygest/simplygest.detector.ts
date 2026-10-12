import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { SimplyGestDetectedInstance } from './simplygest.types';

const logger = new Logger('SimplyGestDetector');

export class SimplyGestDetector {
  private static readonly STANDARD_CANDIDATES: string[] = [
    'C:\\SimplyGest\\Datos.mdb',
    'C:\\SimplyGest\\Datos\\Datos.mdb',
    'C:\\Program Files (x86)\\SimplyGest\\Datos.mdb',
    'C:\\Program Files (x86)\\SimplyGest\\Datos\\Datos.mdb',
    'C:\\Program Files\\SimplyGest\\Datos.mdb',
    'C:\\Archivos de programa\\SimplyGest\\Datos.mdb',
    'C:\\SimplyGest Cloud\\Datos.mdb',
    'D:\\SimplyGest\\Datos.mdb',
    'D:\\SimplyGest\\Datos\\Datos.mdb',
    'E:\\SimplyGest\\Datos.mdb',
  ];

  public static cleanPath(raw: string): string {
    if (!raw) return '';
    return raw.trim().replace(/^["']|["']$/g, '').trim();
  }

  public static resolve(inputPath: string): {
    success: boolean;
    resolvedPath?: string;
    isDirectory?: boolean;
    message?: string;
  } {
    const cleaned = this.cleanPath(inputPath);
    if (!cleaned) {
      return { success: false, message: 'Ruta no especificada' };
    }

    try {
      if (fs.existsSync(cleaned)) {
        const stat = fs.statSync(cleaned);
        if (stat.isDirectory()) {
          // Si el usuario indicó la carpeta, buscar Datos.mdb o *.mdb dentro
          const directFile = path.join(cleaned, 'Datos.mdb');
          if (fs.existsSync(directFile)) {
            return {
              success: true,
              resolvedPath: directFile,
              isDirectory: true,
              message: `Se detectó Datos.mdb dentro de la carpeta: ${directFile}`,
            };
          }

          const files = fs.readdirSync(cleaned);
          const mdbFile = files.find((f) => f.toLowerCase() === 'datos.mdb') || files.find((f) => f.toLowerCase().endsWith('.mdb'));
          if (mdbFile) {
            const foundPath = path.join(cleaned, mdbFile);
            return {
              success: true,
              resolvedPath: foundPath,
              isDirectory: true,
              message: `Se detectó base de datos en la carpeta: ${foundPath}`,
            };
          }

          return {
            success: false,
            isDirectory: true,
            message: `La carpeta ${cleaned} no contiene el archivo Datos.mdb de SimplyGest`,
          };
        }

        return {
          success: true,
          resolvedPath: cleaned,
          isDirectory: false,
        };
      }
    } catch {
      // Ignorar errores de fs transitorios
    }

    return { success: false, resolvedPath: cleaned, message: 'La ruta no existe o no es accesible' };
  }

  public static detectAll(extraSearchDirs: string[] = []): SimplyGestDetectedInstance[] {
    const found: SimplyGestDetectedInstance[] = [];
    const visited = new Set<string>();

    const checkCandidate = (filePath: string) => {
      const normalized = path.normalize(filePath);
      if (visited.has(normalized.toLowerCase())) return;
      visited.add(normalized.toLowerCase());

      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.size > 0) {
            found.push({
              databasePath: filePath,
              companyName: 'SimplyGest Empresa Principal',
              fileSizeBytes: stats.size,
              lastModified: stats.mtime.toISOString(),
            });
            logger.info(`✓ Base de datos SimplyGest detectada: ${filePath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
          }
        }
      } catch {}
    };

    // 1. Probar rutas candidatas estándar
    for (const candidate of this.STANDARD_CANDIDATES) {
      checkCandidate(candidate);
    }

    // 2. Probar rutas adicionales proporcionadas (ej: desde configuración previa)
    for (const dirOrFile of extraSearchDirs) {
      if (!dirOrFile) continue;
      const res = this.resolve(dirOrFile);
      if (res.success && res.resolvedPath) {
        checkCandidate(res.resolvedPath);
      }
    }

    return found;
  }

  public static getPrimaryInstance(): SimplyGestDetectedInstance | null {
    const list = this.detectAll();
    return list[0] ?? null;
  }
}
