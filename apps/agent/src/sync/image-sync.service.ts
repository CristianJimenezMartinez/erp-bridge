import fs from 'fs';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { FactusolImageLocator, ResolvedFactusolImage } from '@erp-bridge/connector-factusol';
import { EventBus } from '../diagnostics/event-bus';

export interface ImageSyncOptions {
  endpointUrl: string;
  secretKey?: string;
  databasePath?: string;
  customPhotosPath?: string;
  concurrency?: number;
}

export interface ImageSyncReport {
  totalArticlesWithImages: number;
  totalUniqueImages: number;
  missingOnServer: number;
  uploadedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

export class ImageSyncService {
  private readonly logger = new Logger('ImageSyncService');

  constructor(
    private readonly options: ImageSyncOptions,
    private readonly eventBus?: EventBus
  ) {}

  public async syncImages(products: CanonicalProduct[]): Promise<ImageSyncReport> {
    const start = Date.now();
    const concurrency = this.options.concurrency || 3;
    const cleanEndpointUrl = this.options.endpointUrl.trim().replace(/\/+$/, '');

    // 1. Instanciar el localizador de imágenes de Factusol
    const locator = new FactusolImageLocator(
      this.options.databasePath,
      this.options.customPhotosPath
    );

    // 2. Extraer artículos con referencia de imagen
    const candidateArticles: Array<{ sku: string; imgart: string }> = [];
    for (const p of products) {
      const imgVal =
        p.attributes?.imgart ||
        (p.images && p.images.length > 0 && p.images[0] ? p.images[0].url : '');
      if (imgVal && p.sku) {
        candidateArticles.push({ sku: p.sku, imgart: String(imgVal).trim() });
      }
    }

    if (candidateArticles.length === 0) {
      this.logger.info('No hay productos con fotos referenciadas en Factusol.');
      return {
        totalArticlesWithImages: 0,
        totalUniqueImages: 0,
        missingOnServer: 0,
        uploadedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        durationMs: Date.now() - start,
      };
    }

    // 3. Resolver imágenes existentes en disco local
    const resolvedBatch = locator.resolveBatch(candidateArticles);
    const existingImagesMap = new Map<string, ResolvedFactusolImage>(); // clave: relativeWebPath

    for (const [_, resolved] of resolvedBatch) {
      if (resolved.exists && resolved.localPath && resolved.relativeWebPath) {
        if (!existingImagesMap.has(resolved.relativeWebPath)) {
          existingImagesMap.set(resolved.relativeWebPath, resolved);
        }
      }
    }

    const uniqueImages = Array.from(existingImagesMap.values());
    this.logger.info(
      `Fotos detectadas localmente: ${uniqueImages.length} únicas en disco para ${candidateArticles.length} artículos.`
    );
    this.eventBus?.addEvent(
      'info',
      `📸 Analizando fotos de Factusol: ${uniqueImages.length} fotos encontradas en disco.`
    );

    if (uniqueImages.length === 0) {
      this.logger.warn('Se encontraron referencias de fotos en Factusol pero los archivos físicos no están en el disco local.');
      this.eventBus?.addEvent('warn', '⚠️ Fotos referenciadas en Factusol pero no localizadas físicamente en disco.');
      return {
        totalArticlesWithImages: candidateArticles.length,
        totalUniqueImages: 0,
        missingOnServer: 0,
        uploadedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        durationMs: Date.now() - start,
      };
    }

    // 4. Dirty-Check remoto: Consultar al endpoint qué imágenes faltan en el hosting
    let missingPaths = new Set<string>();
    try {
      const checkUrl = `${cleanEndpointUrl}?action=check_images`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.options.secretKey) {
        headers['Authorization'] = `Bearer ${this.options.secretKey}`;
      }

      const checkPayload = {
        images: uniqueImages.map((img) => ({
          path: img.relativeWebPath,
          size: img.sizeBytes,
        })),
      };

      const checkRes = await fetch(checkUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkPayload),
        signal: AbortSignal.timeout(15000),
      });

      if (checkRes.ok) {
        const checkJson = (await checkRes.json()) as any;
        if (checkJson && Array.isArray(checkJson.missing)) {
          missingPaths = new Set(checkJson.missing.map((p: string) => p.replace(/\\/g, '/')));
          this.logger.info(
            `Dirty-check completado: ${missingPaths.size} fotos pendientes de subir (${checkJson.existingCount || 0} ya existen en el hosting).`
          );
        }
      } else {
        this.logger.warn(`El endpoint respondió HTTP ${checkRes.status} en check_images. Se procederá a subir todas.`);
        missingPaths = new Set(uniqueImages.map((i) => i.relativeWebPath));
      }
    } catch (checkErr) {
      this.logger.warn(`No se pudo verificar delta de imágenes con el hosting: ${String(checkErr)}. Se intentará subida directa.`);
      missingPaths = new Set(uniqueImages.map((i) => i.relativeWebPath));
    }

    const imagesToUpload = uniqueImages.filter((img) => missingPaths.has(img.relativeWebPath));
    const skippedCount = uniqueImages.length - imagesToUpload.length;

    if (imagesToUpload.length === 0) {
      this.logger.info(`✓ Todas las imágenes (${skippedCount}) ya están sincronizadas en el hosting.`);
      this.eventBus?.addEvent('info', `✓ Todas las fotos de productos (${skippedCount}) ya están al día en la web.`);
      return {
        totalArticlesWithImages: candidateArticles.length,
        totalUniqueImages: uniqueImages.length,
        missingOnServer: 0,
        uploadedCount: 0,
        skippedCount,
        failedCount: 0,
        durationMs: Date.now() - start,
      };
    }

    this.eventBus?.addEvent(
      'info',
      `Subiendo ${imagesToUpload.length} fotos a la tienda web por HTTPS directo (${skippedCount} omitidas por idénticas)...`
    );

    // 5. Transferencia concurrente controlada por HTTPS
    let uploadedCount = 0;
    let failedCount = 0;

    const uploadSingleImage = async (img: ResolvedFactusolImage): Promise<boolean> => {
      try {
        if (!img.localPath || !fs.existsSync(img.localPath)) {
          return false;
        }

        const buffer = await fs.promises.readFile(img.localPath);
        const uploadUrl = `${cleanEndpointUrl}?action=upload_image&path=${encodeURIComponent(
          img.relativeWebPath
        )}&sku=${encodeURIComponent(img.sku)}`;

        const uploadHeaders: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
          'X-File-Path': img.relativeWebPath,
          'X-Product-SKU': img.sku,
        };
        if (this.options.secretKey) {
          uploadHeaders['Authorization'] = `Bearer ${this.options.secretKey}`;
        }

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: uploadHeaders,
          body: buffer,
          signal: AbortSignal.timeout(30000),
        });

        if (uploadRes.ok) {
          const resJson = (await uploadRes.json()) as any;
          return Boolean(resJson && resJson.success);
        }
        return false;
      } catch (err) {
        this.logger.warn(`Error al subir imagen ${img.relativeWebPath}: ${String(err)}`);
        return false;
      }
    };

    // Procesar en tandas de 'concurrency'
    for (let i = 0; i < imagesToUpload.length; i += concurrency) {
      const chunk = imagesToUpload.slice(i, i + concurrency);
      const results = await Promise.all(chunk.map((img) => uploadSingleImage(img)));

      for (const ok of results) {
        if (ok) uploadedCount++;
        else failedCount++;
      }

      const totalDone = uploadedCount + failedCount;
      const pct = Math.round((totalDone / imagesToUpload.length) * 100);
      if (totalDone % 10 === 0 || totalDone === imagesToUpload.length) {
        this.eventBus?.addEvent(
          'info',
          `Subiendo fotos: ${totalDone} / ${imagesToUpload.length} (${pct}%)`
        );
      }
    }

    const durationMs = Date.now() - start;
    this.logger.info(
      `Sincronización de fotos finalizada en ${Math.round(durationMs / 1000)}s: ${uploadedCount} subidas, ${skippedCount} al día, ${failedCount} fallidas.`
    );
    this.eventBus?.addEvent(
      failedCount === 0 ? 'info' : 'warn',
      `✓ Subida de fotos completada: ${uploadedCount} nuevas transferidas, ${skippedCount} ya existentes${failedCount > 0 ? `, ${failedCount} con error` : ''}.`
    );

    return {
      totalArticlesWithImages: candidateArticles.length,
      totalUniqueImages: uniqueImages.length,
      missingOnServer: imagesToUpload.length,
      uploadedCount,
      skippedCount,
      failedCount,
      durationMs,
    };
  }
}
