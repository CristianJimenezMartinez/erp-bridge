import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { FactusolConnector, AccessDriver } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import { FactusolMetadata, ArticlePreviewItem } from './factusol.types';

export class FactusolService {
  private readonly logger = new Logger('FactusolService');
  private factusol: FactusolConnector | null = null;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly eventBus?: EventBus
  ) {}

  public getConnector(): FactusolConnector | null {
    return this.factusol;
  }

  public async connect(customDbPath?: string): Promise<boolean> {
    const config = this.configManager.get();
    const dbPath = customDbPath || config.factusol?.databasePath || config.factusolDbPath;

    if (!dbPath || !fs.existsSync(dbPath)) {
      this.logger.warn(`No se ha configurado o no existe el archivo de Factusol: ${dbPath || 'Sin ruta'}`);
      this.eventBus?.addEvent('warn', '⚠️ Base de datos Factusol no configurada.');
      return false;
    }

    try {
      if (this.factusol) {
        await this.factusol.disconnect();
      }

      this.factusol = new FactusolConnector();
      await this.factusol.connect({
        configuration: {
          databasePath: dbPath,
          orderSeries: config.factusol?.orderSeries || '1',
          defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
          tariffCode: config.factusol?.tariffCode || '1',
        },
      });

      const health = await this.factusol.healthCheck();
      this.logger.info(`Salud inicial Factusol: ${health.status} (${health.message})`, { latencyMs: health.latencyMs });
      this.eventBus?.addEvent('success', `✓ Factusol conectado: ${path.basename(dbPath)}`);
      return health.status === 'HEALTHY';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error al conectar con Factusol: ${msg}`);
      this.eventBus?.addEvent('error', `Error conectando Factusol: ${msg}`);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.factusol) {
      await this.factusol.disconnect();
      this.factusol = null;
    }
  }

  public async testConnection(dbPath: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number }> {
    if (!dbPath || !fs.existsSync(dbPath)) {
      return { success: false, message: 'La ruta especificada no existe en el sistema.' };
    }
    const ext = path.extname(dbPath).toLowerCase();
    if (ext !== '.accdb' && ext !== '.mdb') {
      return { success: false, message: 'El archivo debe ser una base de datos Microsoft Access (.accdb o .mdb).' };
    }

    try {
      const stats = fs.statSync(dbPath);
      const driver = new AccessDriver({ databasePath: dbPath });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      const count = (rows && rows.length > 0 && typeof rows[0]?.total === 'number') ? rows[0]!.total : 0;

      return {
        success: true,
        message: `Conexión exitosa. Se detectaron ${count.toLocaleString('es-ES')} artículos.`,
        articleCount: count,
        fileSizeBytes: stats.size,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Fallo al conectar con Factusol: ${msg}` };
    }
  }

  public async reconnect(dbPath: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number }> {
    const testResult = await this.testConnection(dbPath);
    if (!testResult.success) {
      this.eventBus?.addEvent('error', `Error conectando Factusol: ${testResult.message}`);
      return testResult;
    }

    await this.disconnect();
    this.configManager.setFactusolDbPath(dbPath);
    await this.connect(dbPath);

    this.eventBus?.addEvent('success', `✓ Base de datos Factusol reconectada: ${path.basename(dbPath)}`);
    return testResult;
  }

  public async getArticleCount(customDbPath?: string): Promise<number | undefined> {
    const config = this.configManager.get();
    const dbPath = customDbPath || config.factusol?.databasePath || config.factusolDbPath;
    if (!dbPath || !fs.existsSync(dbPath)) return undefined;

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      if (rows && rows.length > 0 && typeof rows[0]?.total === 'number') {
        return rows[0]!.total;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  public async getMetadata(customDbPath?: string): Promise<FactusolMetadata> {
    const defaultRes: FactusolMetadata = {
      tariffs: [
        { code: '1', name: '1: Tarifa General' },
        { code: '2', name: '2: Tarifa Internet' },
        { code: '3', name: '3: Tarifa Contado' },
      ],
      warehouses: [
        { code: 'GEN', name: 'GEN: Almacén General' },
      ],
      series: ['A', 'B', 'C', '1', '2'],
    };

    const config = this.configManager.get();
    const dbPath = customDbPath || config.factusol?.databasePath || config.factusolDbPath;
    if (!dbPath || !fs.existsSync(dbPath)) return defaultRes;

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      let tariffs = defaultRes.tariffs;
      let warehouses = defaultRes.warehouses;

      try {
        const tRows = await driver.query<{ CODTAR: any; DESTAR: any }>('SELECT CODTAR, DESTAR FROM F_TAR');
        if (tRows && tRows.length > 0) {
          tariffs = tRows.map((r) => ({
            code: String(r.CODTAR || '').trim(),
            name: `${String(r.CODTAR || '').trim()}: ${String(r.DESTAR || '').trim() || 'Tarifa'}`,
          }));
        }
      } catch {}

      try {
        const aRows = await driver.query<{ CODALM: any; NOMALM: any }>('SELECT CODALM, NOMALM FROM F_ALM');
        if (aRows && aRows.length > 0) {
          warehouses = aRows.map((r) => ({
            code: String(r.CODALM || '').trim(),
            name: `${String(r.CODALM || '').trim()}: ${String(r.NOMALM || '').trim() || 'Almacén'}`,
          }));
        }
      } catch {}

      return { tariffs, warehouses, series: defaultRes.series };
    } catch {
      return defaultRes;
    }
  }

  public async getPreviewArticles(customDbPath?: string, limit = 25): Promise<{
    articles: ArticlePreviewItem[];
    total?: number;
  }> {
    const config = this.configManager.get();
    const dbPath = customDbPath || config.factusol?.databasePath || config.factusolDbPath;
    if (!dbPath || !fs.existsSync(dbPath)) return { articles: [], total: 0 };

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      const query = `SELECT TOP ${Math.min(limit, 100)} CODART, DESART, FAMART, PCOART, EANART FROM F_ART WHERE CODART <> '' ORDER BY CODART`;
      const artRows = await driver.query<{ CODART: string; DESART: string; FAMART: string; PCOART: number; EANART: string }>(query);

      let stockMap = new Map<string, number>();
      let priceMap = new Map<string, number>();
      const tariffCode = config.factusol?.tariffCode || '1';
      const isNumericTariff = /^\d+$/.test(tariffCode);
      const tariffCond = isNumericTariff
        ? `(TARLTA = ${tariffCode} OR CStr(TARLTA) = '${tariffCode}')`
        : `CStr(TARLTA) = '${tariffCode.replace(/'/g, "''")}'`;

      try {
        if (artRows.length > 0) {
          const codes = artRows.map((r) => `'${String(r.CODART || '').replace(/'/g, "''")}'`).join(',');
          const sRows = await driver.query<{ ARTSTO: string; ACTSTO: number }>(`SELECT ARTSTO, ACTSTO FROM F_STO WHERE ARTSTO IN (${codes})`);
          for (const s of sRows) {
            stockMap.set(String(s.ARTSTO || '').trim(), Number(s.ACTSTO) || 0);
          }

          try {
            const pRows = await driver.query<{ ARTLTA: string; PRELTA: number }>(
              `SELECT ARTLTA, PRELTA FROM F_LTA WHERE ${tariffCond} AND ARTLTA IN (${codes})`
            );
            for (const p of pRows) {
              priceMap.set(String(p.ARTLTA || '').trim(), Number(p.PRELTA) || 0);
            }
          } catch {}
        }
      } catch {}

      const articles: ArticlePreviewItem[] = artRows.map((r) => {
        const code = String(r.CODART || '').trim();
        const pvp = priceMap.get(code);
        const cost = Number(r.PCOART) || 0;
        return {
          code,
          description: String(r.DESART || '').trim(),
          family: String(r.FAMART || '').trim(),
          costPrice: cost,
          salePrice: pvp !== undefined && pvp > 0 ? pvp : cost,
          stock: stockMap.get(code) ?? 0,
          ean: String(r.EANART || '').trim(),
        };
      });

      return { articles, total: articles.length };
    } catch (err) {
      this.logger.warn(`No se pudo cargar vista previa de artículos: ${String(err)}`);
      return { articles: [], total: 0 };
    }
  }
}
