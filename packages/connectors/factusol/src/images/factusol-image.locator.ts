import fs from 'fs';
import path from 'path';

export interface ResolvedFactusolImage {
  sku: string;
  originalPath: string;
  localPath: string | null;
  relativeWebPath: string;
  exists: boolean;
  sizeBytes?: number;
  filename: string;
}

export class FactusolImageLocator {
  private readonly searchDirectories: string[] = [];

  constructor(databasePath?: string, customPhotosPath?: string) {
    if (customPhotosPath && fs.existsSync(customPhotosPath)) {
      this.searchDirectories.push(path.resolve(customPhotosPath));
    }

    if (databasePath) {
      const dbDir = path.dirname(path.resolve(databasePath));
      const candidates = [
        dbDir,
        path.join(dbDir, 'Fotos'),
        path.join(dbDir, 'FOTOS'),
        path.join(dbDir, 'fotos'),
        path.join(dbDir, '..', 'Fotos'),
        path.join(dbDir, '..', 'FOTOS'),
        path.join(dbDir, '..', '..', 'Fotos'),
        path.join(dbDir, '..', '..', 'FOTOS'),
        // Ubicaciones comunes de proyectos web y assets
        path.join(dbDir, '..', 'web', 'web', 'src', 'assets', 'img', 'factusolImg', 'FOTOS'),
        path.join(dbDir, '..', 'web', 'src', 'assets', 'img', 'factusolImg', 'FOTOS'),
        path.join(dbDir, 'assets', 'img', 'factusolImg', 'FOTOS'),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && !this.searchDirectories.includes(cand)) {
          this.searchDirectories.push(cand);
        }
      }
    }

    // Ubicaciones estándar de Software DELSOL en disco C:
    const standardDelsolPaths = [
      'C:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\Fotos',
      'C:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\FOTOS',
      'C:\\Software DELSOL\\FACTUSOL\\Fotos',
      'C:\\Software DELSOL\\FACTUSOL\\FOTOS',
      'C:\\Software DELSOL\\FACTUSOL\\Datos\\Fotos',
      'C:\\Software DELSOL\\FACTUSOL\\Datos\\FOTOS',
      'D:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\Fotos',
    ];

    for (const d of standardDelsolPaths) {
      if (fs.existsSync(d) && !this.searchDirectories.includes(d)) {
        this.searchDirectories.push(d);
      }
    }
  }

  public getSearchDirectories(): string[] {
    return [...this.searchDirectories];
  }

  public addSearchDirectory(dir: string): void {
    const resolved = path.resolve(dir);
    if (fs.existsSync(resolved) && !this.searchDirectories.includes(resolved)) {
      this.searchDirectories.unshift(resolved);
    }
  }

  /**
   * Resuelve la ruta física y la ruta canónica para la tienda web de un artículo.
   */
  public resolveImage(sku: string, imgart?: string | null): ResolvedFactusolImage {
    const raw = String(imgart ?? '').trim();
    if (!raw) {
      return {
        sku,
        originalPath: '',
        localPath: null,
        relativeWebPath: '',
        exists: false,
        filename: '',
      };
    }

    // Normalizar separadores y eliminar slashes iniciales
    const cleanSlashes = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    const filename = path.basename(cleanSlashes);

    // Determinar la ruta relativa web canónica (ej: FOTOS/BOMBAS/bomba.jpg)
    let relativeWebPath = cleanSlashes;
    const fotosIndex = cleanSlashes.toUpperCase().indexOf('FOTOS/');
    if (fotosIndex !== -1) {
      relativeWebPath = cleanSlashes.substring(fotosIndex);
    } else {
      relativeWebPath = `FOTOS/${cleanSlashes}`;
    }

    // Normalizar el prefijo 'FOTOS/' en mayúsculas
    if (relativeWebPath.toLowerCase().startsWith('fotos/')) {
      relativeWebPath = 'FOTOS/' + relativeWebPath.substring(6);
    }

    // 1. Si es ruta absoluta directa en Windows (ej: C:\...)
    if (/^[a-zA-Z]:[\\/]/.test(raw) && fs.existsSync(raw)) {
      try {
        const stat = fs.statSync(raw);
        if (stat.isFile()) {
          return {
            sku,
            originalPath: raw,
            localPath: path.resolve(raw),
            relativeWebPath,
            exists: true,
            sizeBytes: stat.size,
            filename,
          };
        }
      } catch {}
    }

    // 2. Buscar en los directorios detectados
    const relativeSubPathWithoutFotos = relativeWebPath.replace(/^FOTOS\//i, '');

    for (const dir of this.searchDirectories) {
      const candidates = [
        path.join(dir, relativeWebPath),
        path.join(dir, relativeSubPathWithoutFotos),
        path.join(dir, cleanSlashes),
        path.join(dir, filename),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            const stat = fs.statSync(cand);
            if (stat.isFile()) {
              return {
                sku,
                originalPath: raw,
                localPath: path.resolve(cand),
                relativeWebPath,
                exists: true,
                sizeBytes: stat.size,
                filename,
              };
            }
          } catch {}
        }
      }
    }

    return {
      sku,
      originalPath: raw,
      localPath: null,
      relativeWebPath,
      exists: false,
      filename,
    };
  }

  /**
   * Resuelve en lote todas las imágenes de una lista de artículos.
   */
  public resolveBatch(articles: Array<{ sku: string; imgart?: string | null }>): Map<string, ResolvedFactusolImage> {
    const results = new Map<string, ResolvedFactusolImage>();
    for (const art of articles) {
      if (art.sku) {
        results.set(art.sku, this.resolveImage(art.sku, art.imgart));
      }
    }
    return results;
  }
}
