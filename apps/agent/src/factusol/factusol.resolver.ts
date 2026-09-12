import fs from 'fs';
import path from 'path';
import { PathResolutionResult } from './factusol.types';

export class FactusolPathResolver {
  public static resolve(inputPath: string): PathResolutionResult {
    try {
      const cleanPath = (inputPath || '').trim().replace(/^["']|["']$/g, '');
      if (!cleanPath) {
        return { success: false, resolvedPath: '', isDirectory: false, message: 'Ruta vacía', candidates: [] };
      }

      if (fs.existsSync(cleanPath)) {
        const stat = fs.statSync(cleanPath);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(cleanPath)
            .filter(f => f.toLowerCase().endsWith('.accdb') || f.toLowerCase().endsWith('.mdb'))
            .map(f => {
              const full = path.join(cleanPath, f);
              try {
                const fStat = fs.statSync(full);
                return { path: full, name: f, mtime: fStat.mtimeMs, size: fStat.size };
              } catch {
                return { path: full, name: f, mtime: 0, size: 0 };
              }
            })
            .filter(f => !f.name.startsWith('.~') && !f.name.toLowerCase().endsWith('.ldb') && !f.name.toLowerCase().endsWith('.laccdb'))
            .sort((a, b) => b.mtime - a.mtime);

          const best = files[0];
          if (best) {
            return {
              success: true,
              resolvedPath: best.path,
              isDirectory: true,
              message: `Se detectó la base de datos de Factusol más reciente: ${best.name}`,
              candidates: files.map(f => f.path),
            };
          } else {
            return {
              success: false,
              resolvedPath: cleanPath,
              isDirectory: true,
              message: 'No se encontraron archivos .accdb de Factusol en la carpeta seleccionada.',
              candidates: [],
            };
          }
        } else {
          return {
            success: true,
            resolvedPath: cleanPath,
            isDirectory: false,
            message: `Archivo seleccionado: ${path.basename(cleanPath)}`,
            candidates: [cleanPath],
          };
        }
      }

      return {
        success: false,
        resolvedPath: cleanPath,
        isDirectory: false,
        message: 'La ruta indicada no existe en el equipo.',
        candidates: [],
      };
    } catch (err) {
      return {
        success: false,
        resolvedPath: inputPath,
        isDirectory: false,
        message: `Error al comprobar la ruta: ${String(err)}`,
        candidates: [],
      };
    }
  }
}
