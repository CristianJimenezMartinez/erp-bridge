import fs from 'fs';
import os from 'os';
import path from 'path';
import { CanonicalProduct } from '@erp-bridge/shared';
import { FactusolImageLocator, ResolvedFactusolImage } from '@erp-bridge/connector-factusol';

export interface UniversalImageResolverOptions {
  providerId?: string;
  databasePath?: string;
  customPhotosPath?: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

const STANDARD_ERP_PHOTO_DIRS: Record<string, string[]> = {
  factusol: [
    'C:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\Fotos',
    'C:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\FOTOS',
    'C:\\Software DELSOL\\FACTUSOL\\Fotos',
    'C:\\Software DELSOL\\FACTUSOL\\FOTOS',
    'C:\\Software DELSOL\\FACTUSOL\\Datos\\Fotos',
    'D:\\Software DELSOL\\FACTUSOL\\Datos\\FS\\Fotos',
  ],
  simplygest: [
    'C:\\SimplyGest\\Fotos',
    'C:\\SimplyGest\\FOTOS',
    'C:\\SimplyGest\\Imagenes',
    'C:\\SimplyGest\\IMAGENES',
    'C:\\SimplyGest\\Images',
    'C:\\SimplyGest\\Datos\\Fotos',
    'C:\\SimplyGest\\Datos\\Imagenes',
    'C:\\SimplyGest\\Multimedia',
  ],
  sage50: [
    'C:\\Sage50\\Fotos',
    'C:\\Sage50\\Imagenes',
    'C:\\Sage50\\Multimedia',
    'C:\\Eurowin\\Fotos',
    'C:\\Eurowin\\Imagenes',
    'C:\\BentianLab\\Fotos',
    'C:\\BentianLab\\Imagenes',
  ],
  a3erp: [
    'C:\\a3ERP\\Fotos',
    'C:\\a3ERP\\Imagenes',
    'C:\\Imagenes',
    'C:\\Program Files (x86)\\A3\\A3ERP\\Imagenes',
    'C:\\Program Files\\A3\\A3ERP\\Imagenes',
    'C:\\BentianLab\\Fotos',
    'C:\\BentianLab\\Imagenes',
  ],
  agora: [
    'C:\\ProgramData\\IGT Microelectronics\\Agora\\Images',
    'C:\\ProgramData\\IGT Microelectronics\\Agora\\Fotos',
    'C:\\Program Files (x86)\\IGT Microelectronics\\Agora\\Images',
    'C:\\Agora\\Images',
    'C:\\Agora\\Fotos',
    'C:\\BentianLab\\Fotos',
    'C:\\BentianLab\\Imagenes',
  ],
};

/**
 * Resolutor Universal Multi-ERP de Imágenes de Artículos.
 * Soporta las 4 casuísticas reales del mercado (Factusol, SimplyGest, Sage 50, a3ERP y Ágora POS):
 *  1. Extracción automática de campos BLOB / VARBINARY / IMAGE / Base64 / Hexadecimal (con stripping de cabeceras OLE de Access).
 *  2. Resolución de rutas explícitas en BD (IMGART, ART_FOTO.IMAGEN, Gestión Documental SimplyGest, FICHERO a3ERP, rutas UNC/locales).
 *  3. Auto-descubrimiento en carpetas por convención (<SKU>.jpg, <SKU_normalizado>.png, <SKU>_1.jpg, <EAN13>.jpg, subcarpetas de familia).
 *  4. Enriquecimiento automático del producto canónico para sincronización directa a Universal Bridge, WooCommerce, PrestaShop y Shopify.
 */
export class UniversalErpImageResolver {
  private readonly baseLocator: FactusolImageLocator;
  private readonly providerId: string;
  private readonly fileIndex = new Map<string, string>(); // lowercase filename -> full local path
  private indexBuilt = false;

  constructor(options: UniversalImageResolverOptions = {}) {
    this.providerId = (options.providerId || 'factusol').toLowerCase();
    const cleanDbPath = this.extractCleanFilesystemPath(options.databasePath);
    this.baseLocator = new FactusolImageLocator(cleanDbPath, options.customPhotosPath);
    this.registerMultiErpDirectories(cleanDbPath, options.customPhotosPath);
  }

  private extractCleanFilesystemPath(rawDbPath?: string): string | undefined {
    if (!rawDbPath) return undefined;
    const trimmed = rawDbPath.trim();
    if (trimmed.toUpperCase().startsWith('DEMO://')) return undefined;
    if (/^mssql:\/\//i.test(trimmed)) {
      const afterScheme = trimmed.slice('mssql://'.length);
      const slashIdx = afterScheme.indexOf('/');
      if (slashIdx > 0) {
        const dbPart = afterScheme.slice(slashIdx + 1);
        if (/\.(mdb|accdb)$/i.test(dbPart) && fs.existsSync(dbPart)) {
          return path.resolve(dbPart);
        }
      }
      return undefined;
    }
    const clean = trimmed.replace(/^(mdb|localdb|file):\/\//i, '');
    return fs.existsSync(clean) ? path.resolve(clean) : undefined;
  }

  private registerMultiErpDirectories(cleanDbPath?: string, customPhotosPath?: string): void {
    const candidateDirs: string[] = [];

    if (customPhotosPath && fs.existsSync(customPhotosPath)) {
      candidateDirs.push(path.resolve(customPhotosPath));
    }

    if (cleanDbPath) {
      const dbDir = path.dirname(cleanDbPath);
      const folderNames = ['Fotos', 'FOTOS', 'fotos', 'Imagenes', 'IMAGENES', 'imagenes', 'Images', 'Multimedia', 'Articulos'];
      candidateDirs.push(dbDir);
      for (const fn of folderNames) {
        candidateDirs.push(path.join(dbDir, fn));
        candidateDirs.push(path.join(dbDir, '..', fn));
        candidateDirs.push(path.join(dbDir, '..', '..', fn));
      }
    }

    // Añadir directorios estándar del proveedor activo y globales de respaldo
    const providerDirs = STANDARD_ERP_PHOTO_DIRS[this.providerId] || [];
    for (const d of providerDirs) {
      candidateDirs.push(d);
    }
    for (const dirs of Object.values(STANDARD_ERP_PHOTO_DIRS)) {
      for (const d of dirs) {
        if (!candidateDirs.includes(d)) candidateDirs.push(d);
      }
    }

    for (const dir of candidateDirs) {
      if (dir && fs.existsSync(dir)) {
        try {
          if (fs.statSync(dir).isDirectory()) {
            this.baseLocator.addSearchDirectory(dir);
          }
        } catch {}
      }
    }
  }

  public getSearchDirectories(): string[] {
    return this.baseLocator.getSearchDirectories();
  }

  private ensureFileIndex(): void {
    if (this.indexBuilt) return;
    this.indexBuilt = true;

    for (const dir of this.baseLocator.getSearchDirectories()) {
      this.indexDirectoryRecursive(dir, 0, 2);
    }
  }

  private indexDirectoryRecursive(dir: string, depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          const lowerName = entry.name.toLowerCase();
          if (!this.fileIndex.has(lowerName)) {
            this.fileIndex.set(lowerName, fullPath);
          }
        }
      } else if (entry.isDirectory() && depth < maxDepth && !entry.name.startsWith('.')) {
        this.indexDirectoryRecursive(fullPath, depth + 1, maxDepth);
      }
    }
  }

  /**
   * Detecta si un valor devuelto por la BD es un binario/BLOB codificado (Data URI, Base64, Hex SQL 0x... o contenedor OLE)
   * y lo materializa en un archivo físico temporal con escritura atómica (.tmp + renameSync).
   */
  public tryMaterializeEmbeddedBlob(sku: string, rawValue?: unknown): ResolvedFactusolImage | null {
    if (!rawValue) return null;

    let buf: Buffer | null = null;

    if (Buffer.isBuffer(rawValue)) {
      buf = rawValue;
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length < 32) return null;

      // 1. Data URI: data:image/jpeg;base64,...
      const dataUriMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i);
      if (dataUriMatch && dataUriMatch[2]) {
        try {
          buf = Buffer.from(dataUriMatch[2].trim(), 'base64');
        } catch {
          buf = null;
        }
      }
      // 2. Hexadecimal SQL Server / ADO: 0xFFD8FF... o FFD8FFE0...
      else if (/^(0x)?[0-9a-fA-F]{64,}$/.test(trimmed) && trimmed.length % 2 === 0) {
        const hexClean = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
        try {
          buf = Buffer.from(hexClean, 'hex');
        } catch {
          buf = null;
        }
      }
      // 3. Base64 puro con prefijos conocidos de imagen (JPEG: /9j/, PNG: iVBORw0KGgo, GIF: R0lGOD, WebP: UklGR, BMP: Qk)
      else if (/^(\/9j\/|iVBORw0KGgo|R0lGOD|UklGR|Qk[0-9a-zA-Z+/])/i.test(trimmed)) {
        try {
          buf = Buffer.from(trimmed, 'base64');
        } catch {
          buf = null;
        }
      }
    }

    if (!buf || buf.length < 16) return null;

    // Detectar magic bytes reales (incluso si vienen precedidos por una cabecera OLE de Microsoft Access/SimplyGest)
    const extracted = this.extractImageFromBuffer(buf);
    if (!extracted) return null;

    const safeSku = String(sku || 'item')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${safeSku}${extracted.ext}`;
    const cacheDir = path.join(os.tmpdir(), 'bentian-erp-images', this.providerId);
    fs.mkdirSync(cacheDir, { recursive: true });

    const finalPath = path.join(cacheDir, filename);
    const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, extracted.data);
    fs.renameSync(tmpPath, finalPath);

    const relativeWebPath = `FOTOS/${filename}`;
    return {
      sku,
      originalPath: `[BLOB:${extracted.ext.slice(1).toUpperCase()}]`,
      localPath: finalPath,
      relativeWebPath,
      exists: true,
      sizeBytes: extracted.data.length,
      filename,
    };
  }

  private extractImageFromBuffer(buf: Buffer): { data: Buffer; ext: string } | null {
    const maxScanOffset = Math.min(buf.length - 12, 256); // Soporta cabeceras OLE de hasta 256 bytes

    for (let offset = 0; offset <= maxScanOffset; offset++) {
      // JPEG: FF D8 FF
      if (buf[offset] === 0xff && buf[offset + 1] === 0xd8 && buf[offset + 2] === 0xff) {
        return { data: offset === 0 ? buf : buf.subarray(offset), ext: '.jpg' };
      }
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (
        buf[offset] === 0x89 &&
        buf[offset + 1] === 0x50 &&
        buf[offset + 2] === 0x4e &&
        buf[offset + 3] === 0x47
      ) {
        return { data: offset === 0 ? buf : buf.subarray(offset), ext: '.png' };
      }
      // GIF: 47 49 46 38 ("GIF8")
      if (
        buf[offset] === 0x47 &&
        buf[offset + 1] === 0x49 &&
        buf[offset + 2] === 0x46 &&
        buf[offset + 3] === 0x38
      ) {
        return { data: offset === 0 ? buf : buf.subarray(offset), ext: '.gif' };
      }
      // WebP: "RIFF" .... "WEBP"
      if (
        buf[offset] === 0x52 &&
        buf[offset + 1] === 0x49 &&
        buf[offset + 2] === 0x46 &&
        buf[offset + 3] === 0x46 &&
        buf[offset + 8] === 0x57 &&
        buf[offset + 9] === 0x45 &&
        buf[offset + 10] === 0x42 &&
        buf[offset + 11] === 0x50
      ) {
        return { data: offset === 0 ? buf : buf.subarray(offset), ext: '.webp' };
      }
      // BMP: 42 4D ("BM") en offset 0
      if (offset === 0 && buf[0] === 0x42 && buf[1] === 0x4d && buf.length > 26) {
        return { data: buf, ext: '.bmp' };
      }
    }

    return null;
  }

  /**
   * Resuelve la imagen de un producto combinando las 3 capas:
   *  1. BLOB / Base64 / Hex incrustado
   *  2. Ruta explícita en BD (IMGART / IMAGEN / ART_FOTO / FICHERO)
   *  3. Auto-descubrimiento en carpetas por SKU, SKU normalizado, SKU_1 y Código de Barras (EAN)
   */
  public resolveProductImage(product: Partial<CanonicalProduct> & { sku?: string }): ResolvedFactusolImage {
    const sku = String(product.sku || '').trim();
    const rawImgVal =
      product.attributes?.imgart ||
      (product.images && product.images.length > 0 && product.images[0] ? product.images[0].url : '') ||
      (product.rawSourceData as any)?.IMAGEN ||
      (product.rawSourceData as any)?.FOTO ||
      (product.rawSourceData as any)?.imagen ||
      (product.rawSourceData as any)?.imagePath ||
      '';

    // Capa 1: ¿Es un binario / BLOB / Base64 / Hexadecimal?
    if (rawImgVal) {
      const blobResolved = this.tryMaterializeEmbeddedBlob(sku, rawImgVal);
      if (blobResolved && blobResolved.exists) {
        return blobResolved;
      }
    }

    // Capa 2: ¿Tiene ruta explícita en BD y existe en las carpetas registradas?
    if (typeof rawImgVal === 'string' && rawImgVal.trim().length > 0 && !rawImgVal.startsWith('http')) {
      const explicitResolved = this.baseLocator.resolveImage(sku, rawImgVal.trim());
      if (explicitResolved.exists) {
        return explicitResolved;
      }
    }

    // Capa 3: Auto-descubrimiento en carpetas por convención de código SKU / EAN
    this.ensureFileIndex();
    const candidateStems = this.buildCandidateStems(sku, product.barcode);

    for (const stem of candidateStems) {
      for (const ext of ALLOWED_EXTENSIONS) {
        const key = `${stem}${ext}`.toLowerCase();
        const foundPath = this.fileIndex.get(key);
        if (foundPath && fs.existsSync(foundPath)) {
          try {
            const stat = fs.statSync(foundPath);
            if (stat.isFile()) {
              const filename = path.basename(foundPath);
              return {
                sku,
                originalPath: filename,
                localPath: foundPath,
                relativeWebPath: `FOTOS/${filename}`,
                exists: true,
                sizeBytes: stat.size,
                filename,
              };
            }
          } catch {}
        }
      }
    }

    // Si tenía referencia explícita aunque no exista en disco, conservar el resultado diagnóstico
    if (typeof rawImgVal === 'string' && rawImgVal.trim().length > 0) {
      return this.baseLocator.resolveImage(sku, rawImgVal.trim());
    }

    return {
      sku,
      originalPath: '',
      localPath: null,
      relativeWebPath: '',
      exists: false,
      filename: '',
    };
  }

  private buildCandidateStems(sku: string, barcode?: string): string[] {
    const stems = new Set<string>();
    const cleanSku = sku.trim();
    if (cleanSku) {
      stems.add(cleanSku);
      // Variantes sin caracteres especiales ni barras/guiones
      const underscoreSku = cleanSku.replace(/[^a-zA-Z0-9]/g, '_');
      const compactSku = cleanSku.replace(/[^a-zA-Z0-9]/g, '');
      stems.add(underscoreSku);
      if (compactSku.length >= 2) stems.add(compactSku);

      // Convenciones de imagen principal en Sage 50 (LINEA=1), PrestaShop y SimplyGest
      stems.add(`${cleanSku}_1`);
      stems.add(`${cleanSku}-1`);
      stems.add(`${cleanSku}_01`);
      stems.add(`${underscoreSku}_1`);
    }

    const cleanBarcode = String(barcode || '').trim();
    if (cleanBarcode && cleanBarcode.length >= 6) {
      stems.add(cleanBarcode);
    }

    return Array.from(stems);
  }
}
