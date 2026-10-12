import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { SimplyGestConnector } from '@erp-bridge/connector-simplygest';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import {
  SimplyGestArticlePreviewItem,
  SimplyGestTestResult,
} from './simplygest.types';
import { SimplyGestDetector } from './simplygest.detector';

export class SimplyGestService {
  private readonly logger = new Logger('SimplyGestService');
  private connector: SimplyGestConnector | null = null;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly eventBus?: EventBus
  ) {}

  public getConnector(): SimplyGestConnector | null {
    return this.connector;
  }

  public async connect(customDbPath?: string): Promise<boolean> {
    const config = this.configManager.get();
    let dbPath = SimplyGestDetector.cleanPath(
      customDbPath || config.simplygest?.databasePath || config.simplygestDbPath || ''
    );

    if (!dbPath) {
      this.logger.warn(`No se ha configurado la base de datos de SimplyGest: ${dbPath || 'Sin ruta'}`);
      this.eventBus?.addEvent('warn', '⚠️ Base de datos SimplyGest no configurada.');
      return false;
    }

    const resolved = SimplyGestDetector.resolve(dbPath);
    if (resolved.success && resolved.resolvedPath) {
      dbPath = resolved.resolvedPath;
    }

    if (!fs.existsSync(dbPath)) {
      this.logger.warn(`No existe o no está accesible el archivo Datos.mdb de SimplyGest: ${dbPath}`);
      this.eventBus?.addEvent('warn', `⚠️ Base de datos SimplyGest no accesible: ${path.basename(dbPath) || dbPath}`);
      return false;
    }

    try {
      if (this.connector) {
        await this.connector.disconnect();
      }

      this.connector = new SimplyGestConnector();
      await this.connector.connect({
        configuration: {
          databasePath: dbPath,
        },
      });

      const health = await this.connector.healthCheck();
      this.logger.info(`Salud inicial SimplyGest: ${health.status} (${health.message})`, {
        latencyMs: health.latencyMs,
      });

      const isHealthy = health.status === 'HEALTHY';
      if (isHealthy) {
        this.eventBus?.addEvent('success', `✓ SimplyGest conectado: ${path.basename(dbPath)}`);
      }
      return isHealthy;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error al conectar con SimplyGest: ${msg}`);
      this.eventBus?.addEvent('error', `Error conectando SimplyGest: ${msg}`);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
    }
  }

  public async testConnection(dbPathInput: string): Promise<SimplyGestTestResult> {
    let dbPath = SimplyGestDetector.cleanPath(dbPathInput);
    if (!dbPath) {
      return { success: false, message: 'Introduce o selecciona la ruta del archivo Datos.mdb de SimplyGest.' };
    }

    const resolved = SimplyGestDetector.resolve(dbPath);
    if (resolved.success && resolved.resolvedPath) {
      dbPath = resolved.resolvedPath;
    }

    if (!fs.existsSync(dbPath)) {
      return {
        success: false,
        message: `El archivo Datos.mdb no existe en la ruta indicada: "${dbPath}". Revisa que la unidad o carpeta sea correcta.`,
        resolvedPath: dbPath,
      };
    }

    const stats = fs.statSync(dbPath);
    const fileSizeBytes = stats.size;

    const tempConnector = new SimplyGestConnector();
    try {
      await tempConnector.connect({
        configuration: {
          databasePath: dbPath,
        },
      });

      const health = await tempConnector.healthCheck();
      if (health.status !== 'HEALTHY') {
        await tempConnector.disconnect();
        return {
          success: false,
          message: health.message || 'La comprobación de salud de SimplyGest no respondió satisfactoriamente.',
          fileSizeBytes,
          resolvedPath: dbPath,
        };
      }

      let articleCount = 0;
      try {
        const products = await tempConnector.readProducts({ limit: 100 });
        articleCount = products.length;
      } catch {
        articleCount = 0;
      }

      await tempConnector.disconnect();

      return {
        success: true,
        message: `✓ Conexión con SimplyGest establecida con éxito. Base de datos operativa (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB).`,
        articleCount,
        fileSizeBytes,
        resolvedPath: dbPath,
      };
    } catch (err) {
      try { await tempConnector.disconnect(); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Fallo al abrir base de datos SimplyGest: ${msg}`,
        fileSizeBytes,
        resolvedPath: dbPath,
      };
    }
  }

  public async getArticleCount(customDbPath?: string): Promise<number> {
    const config = this.configManager.get();
    const dbPath = SimplyGestDetector.cleanPath(customDbPath || config.simplygest?.databasePath || config.simplygestDbPath || '');
    if (!dbPath || !fs.existsSync(dbPath)) return 0;

    let localConnector = this.connector;
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({ configuration: { databasePath: dbPath } });
      shouldDisconnect = true;
    }

    try {
      const items = await localConnector.readProducts({ limit: 500 });
      return items.length;
    } catch {
      return 0;
    } finally {
      if (shouldDisconnect && localConnector) {
        await localConnector.disconnect();
      }
    }
  }

  public async getPreviewArticles(customDbPath?: string, limit = 25): Promise<SimplyGestArticlePreviewItem[]> {
    const config = this.configManager.get();
    const dbPath = SimplyGestDetector.cleanPath(customDbPath || config.simplygest?.databasePath || config.simplygestDbPath || '');
    if (!dbPath || !fs.existsSync(dbPath)) {
      return [];
    }

    let localConnector = this.connector;
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({ configuration: { databasePath: dbPath } });
      shouldDisconnect = true;
    }

    try {
      const products = await localConnector.readProducts({ limit });
      return products.map((p) => ({
        code: p.sku,
        description: p.name,
        family: p.categories?.[0]?.name || 'GEN',
        stock: p.stockQuantity ?? 0,
        salePrice: p.regularPrice,
        costPrice: p.costPrice,
        ean: p.barcode,
      }));
    } catch (err) {
      this.logger.warn(`Error al obtener vista previa de artículos SimplyGest: ${String(err)}`);
      return [];
    } finally {
      if (shouldDisconnect && localConnector) {
        await localConnector.disconnect();
      }
    }
  }
}
