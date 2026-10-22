import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { SimplyGestDetectedInstance } from './simplygest.types';

const logger = new Logger('SimplyGestDetector');

export class SimplyGestDetector {
  private static readonly STANDARD_CANDIDATES: string[] = [
    'C:\\SimplyGest\\Datos\\Emp1\\articulos.dat',
    'C:\\SimplyGest\\Datos\\articulos.dat',
    'C:\\SimplyGest\\Datos.mdb',
    'C:\\SimplyGest\\Datos\\Datos.mdb',
    'C:\\Program Files (x86)\\SimplyGest\\Datos\\Emp1\\articulos.dat',
    'C:\\Program Files (x86)\\SimplyGest\\Datos\\articulos.dat',
    'C:\\Program Files (x86)\\SimplyGest\\Datos.mdb',
    'C:\\Program Files (x86)\\SimplyGest\\Datos\\Datos.mdb',
    'C:\\Program Files\\SimplyGest\\Datos\\Emp1\\articulos.dat',
    'C:\\Program Files\\SimplyGest\\Datos.mdb',
    'C:\\Archivos de programa\\SimplyGest\\Datos.mdb',
    'C:\\SimplyGest Cloud\\Datos.mdb',
    'D:\\SimplyGest\\Datos\\Emp1\\articulos.dat',
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

    if (/^(https?|sgapi):\/\//i.test(cleaned)) {
      return {
        success: true,
        resolvedPath: cleaned,
        isDirectory: false,
        message: `Conexión API HTTP SimplyGest Server: ${cleaned}`,
      };
    }

    try {
      if (fs.existsSync(cleaned)) {
        const stat = fs.statSync(cleaned);
        if (stat.isDirectory()) {
          // 1. Buscar tablas nativas DBISAM (articulos.dat) en la carpeta o en Emp1/
          const datDirect = path.join(cleaned, 'articulos.dat');
          if (fs.existsSync(datDirect)) {
            return {
              success: true,
              resolvedPath: datDirect,
              isDirectory: true,
              message: `Se detectó tabla nativa DBISAM articulos.dat en: ${datDirect}`,
            };
          }
          const datEmp1 = path.join(cleaned, 'Emp1', 'articulos.dat');
          if (fs.existsSync(datEmp1)) {
            return {
              success: true,
              resolvedPath: datEmp1,
              isDirectory: true,
              message: `Se detectó empresa SimplyGest (Emp1\\articulos.dat) en: ${datEmp1}`,
            };
          }
          const datDatosEmp1 = path.join(cleaned, 'Datos', 'Emp1', 'articulos.dat');
          if (fs.existsSync(datDatosEmp1)) {
            return {
              success: true,
              resolvedPath: datDatosEmp1,
              isDirectory: true,
              message: `Se detectó empresa SimplyGest (Datos\\Emp1\\articulos.dat) en: ${datDatosEmp1}`,
            };
          }
          const datDatosDirect = path.join(cleaned, 'Datos', 'articulos.dat');
          if (fs.existsSync(datDatosDirect)) {
            return {
              success: true,
              resolvedPath: datDatosDirect,
              isDirectory: true,
              message: `Se detectó tabla DBISAM (Datos\\articulos.dat) en: ${datDatosDirect}`,
            };
          }

          // 2. Si el usuario indicó la carpeta, buscar Datos.mdb o *.mdb dentro
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
          const datFile = files.find((f) => f.toLowerCase() === 'articulos.dat');
          if (datFile) {
            const foundDat = path.join(cleaned, datFile);
            return {
              success: true,
              resolvedPath: foundDat,
              isDirectory: true,
              message: `Se detectó tabla DBISAM en la carpeta: ${foundDat}`,
            };
          }

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
            message: `La carpeta ${cleaned} no contiene articulos.dat (DBISAM) ni Datos.mdb de SimplyGest`,
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
