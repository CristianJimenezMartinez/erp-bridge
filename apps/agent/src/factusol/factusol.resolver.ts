import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { PathResolutionResult } from './factusol.types';

export class FactusolPathResolver {
  public static cleanPath(inputPath: string): string {
    let p = (inputPath || '').trim();
    // Eliminar comillas iniciales y finales (habitual al "Copiar como ruta de acceso" en Windows)
    p = p.replace(/^["']|["']$/g, '').trim();
    // Normalizar barras: si es ruta UNC (\\...), preservar \\ inicial
    if (p.startsWith('\\\\') || p.startsWith('//')) {
      const rest = p.substring(2).replace(/\//g, '\\');
      return '\\\\' + rest;
    }
    return p.replace(/\//g, '\\');
  }

  public static resolveMappedDriveToUnc(candidatePath: string): string | null {
    if (process.platform !== 'win32') return null;
    const cleaned = this.cleanPath(candidatePath);
    const driveMatch = cleaned.match(/^([a-zA-Z]):(\\(.*))?$/);
    if (!driveMatch) return null;

    const letter = driveMatch[1]!.toUpperCase();
    const relativePart = driveMatch[3] || '';

    // 1. Consultar registro de Windows HKCU\Network\<Letter> (la vía más rápida, ~10ms)
    try {
      const regOut = childProcess.execSync(`reg query "HKCU\\Network\\${letter}" /v RemotePath`, {
        encoding: 'utf8',
        timeout: 2500,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const match = regOut.match(/RemotePath\s+REG_SZ\s+(\S.*)/i);
      if (match && match[1]) {
        const remoteUnc = match[1].trim().replace(/\//g, '\\');
        return relativePart ? path.join(remoteUnc, relativePart) : remoteUnc;
      }
    } catch {}

    // 2. Fallback: net use
    try {
      const netOut = childProcess.execSync('net use', {
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const re = new RegExp(`\\b${letter}:\\s+(\\\\\\\\[^\\s]+)`, 'i');
      const netMatch = netOut.match(re);
      if (netMatch && netMatch[1]) {
        const remoteUnc = netMatch[1].trim().replace(/\//g, '\\');
        return relativePart ? path.join(remoteUnc, relativePart) : remoteUnc;
      }
    } catch {}

    return null;
  }

  public static resolve(inputPath: string): PathResolutionResult {
    try {
      const cleanPath = this.cleanPath(inputPath);
      if (!cleanPath) {
        return { success: false, resolvedPath: '', isDirectory: false, message: 'Ruta vacía', candidates: [] };
      }

      let checkTarget = cleanPath;
      let usedUncFallback = false;

      // Si la ruta no existe directamente, comprobar si es una unidad mapeada con equivalente UNC
      if (!fs.existsSync(checkTarget)) {
        const uncCandidate = this.resolveMappedDriveToUnc(cleanPath);
        if (uncCandidate && fs.existsSync(uncCandidate)) {
          checkTarget = uncCandidate;
          usedUncFallback = true;
        }
      }

      if (fs.existsSync(checkTarget)) {
        const stat = fs.statSync(checkTarget);
        if (stat.isDirectory()) {
          const files = fs.readdirSync(checkTarget)
            .filter(f => f.toLowerCase().endsWith('.accdb') || f.toLowerCase().endsWith('.mdb'))
            .map(f => {
              const full = path.join(checkTarget, f);
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
            const prefixMsg = usedUncFallback ? ' (mediante ruta UNC de red)' : '';
            return {
              success: true,
              resolvedPath: best.path,
              isDirectory: true,
              message: `Se detectó la base de datos de Factusol más reciente: ${best.name}${prefixMsg}`,
              candidates: files.map(f => f.path),
            };
          } else {
            return {
              success: false,
              resolvedPath: cleanPath,
              isDirectory: true,
              message: 'No se encontraron archivos .accdb ni .mdb de Factusol en la carpeta seleccionada.',
              candidates: [],
            };
          }
        } else {
          const prefixMsg = usedUncFallback ? ' (resuelto vía UNC de red)' : '';
          return {
            success: true,
            resolvedPath: checkTarget,
            isDirectory: false,
            message: `Archivo seleccionado: ${path.basename(checkTarget)}${prefixMsg}`,
            candidates: [checkTarget],
          };
        }
      }

      return {
        success: false,
        resolvedPath: cleanPath,
        isDirectory: false,
        message: 'La ruta indicada no responde o no está accesible en este momento. La ruta se mantendrá guardada (Anti-Wiping).',
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

