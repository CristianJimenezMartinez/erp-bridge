import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import {
  FactusolConnector,
  AccessDriver,
  FactusolYearResolver,
  DEFAULT_FACTUSOL_ORDER_SERIES,
  buildStockSumQuery,
  resolveStockWarehouse,
  normalizeStockQuantity,
  sanitizeAndTruncate,
} from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import { FactusolMetadata, ArticlePreviewItem, ArticlePreviewResult } from './factusol.types';
import { FactusolPathResolver } from './factusol.resolver';

/** F9: la base de datos de Factusol no está accesible (distinto de "catálogo/stock vacío"). */
export class FactusolOfflineError extends Error {
  constructor(message = 'Base de datos Factusol no accesible (Desconectado/Offline)') {
    super(message);
    this.name = 'FactusolOfflineError';
    Object.setPrototypeOf(this, FactusolOfflineError.prototype);
  }
}

/** Configuración efectiva de Factusol, unificada entre `factusol.*` y `softwareErp.providers.factusol.*` (F5). */
export interface FactusolEffectiveSettings {
  databasePath: string;
  tariffCode: string;
  saleTariffCode?: string;
  orderSeries: string;
  invoiceSeries: string;
  warehouseCode: string;
  activeOnly?: boolean;
  autoRollover: boolean;
  evaluationMode: boolean;
}

export interface FactusolActivePath {
  /** Ruta tal como está configurada (nunca se modifica ni se borra: anti-wiping). */
  configuredPath: string;
  /** Ruta realmente a usar (UNC equivalente y/o ejercicio fiscal resuelto por FactusolYearResolver). */
  activePath: string;
  exists: boolean;
  switchedYear: boolean;
}

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

  /**
   * F5: lee la configuración igual que el adaptador: `softwareErp.providers.factusol.*` tiene prioridad sobre
   * `factusol.*` (legacy) y sobre `factusolDbPath`. Series por defecto única: '1'.
   */
  public getSettings(): FactusolEffectiveSettings {
    const cfg = this.configManager.get();
    const legacy = (cfg.factusol || {}) as Record<string, any>;
    const provider = (cfg.softwareErp?.providers?.factusol || {}) as Record<string, any>;
    const pick = (key: string): any => {
      const p = provider[key];
      if (p !== undefined && p !== null && String(p).trim() !== '') return p;
      return legacy[key];
    };
    const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v).trim());
    return {
      databasePath: str(pick('databasePath')) || str(cfg.factusolDbPath),
      tariffCode: str(pick('tariffCode')) || '1',
      saleTariffCode: str(pick('saleTariffCode')) || undefined,
      orderSeries: str(pick('orderSeries')) || DEFAULT_FACTUSOL_ORDER_SERIES,
      invoiceSeries: str(pick('invoiceSeries')) || '1',
      warehouseCode: str(pick('warehouseCode')) || 'GEN',
      activeOnly: pick('activeOnly') === undefined ? undefined : Boolean(pick('activeOnly')),
      autoRollover: legacy['autoRollover'] !== false && provider['autoRollover'] !== false,
      evaluationMode: Boolean(provider['evaluationMode']),
    };
  }

  /**
   * F1: ÚNICA fuente de la ruta real a abrir. Aplica limpieza, equivalente UNC y `FactusolYearResolver`
   * (cambio de ejercicio). No modifica la ruta configurada.
   */
  public resolveActiveDbPath(customDbPath?: string): FactusolActivePath {
    const settings = this.getSettings();
    const configuredPath = FactusolPathResolver.cleanPath(customDbPath || settings.databasePath || '');
    let activePath = configuredPath;
    if (!configuredPath) return { configuredPath, activePath, exists: false, switchedYear: false };

    if (!fs.existsSync(activePath)) {
      const unc = FactusolPathResolver.resolveMappedDriveToUnc(activePath);
      if (unc && fs.existsSync(unc)) activePath = unc;
    }

    let switchedYear = false;
    try {
      const resolution = FactusolYearResolver.resolveActiveDatabase(activePath, settings.autoRollover);
      if (resolution.switched && resolution.activePath && fs.existsSync(resolution.activePath)) {
        activePath = resolution.activePath;
        switchedYear = true;
      }
    } catch (err) {
      this.logger.warn(`No se pudo resolver el ejercicio fiscal de Factusol: ${String(err)}`);
    }

    return { configuredPath, activePath, exists: fs.existsSync(activePath), switchedYear };
  }

  private buildConnectorConfig(dbPath: string) {
    const s = this.getSettings();
    return {
      databasePath: dbPath,
      orderSeries: s.orderSeries,
      invoiceSeries: s.invoiceSeries,
      defaultWarehouse: s.warehouseCode,
      tariffCode: s.tariffCode,
      saleTariffCode: s.saleTariffCode,
      activeOnly: s.activeOnly,
      autoRollover: s.autoRollover,
    };
  }

  public async connect(customDbPath?: string): Promise<boolean> {
    const resolved = this.resolveActiveDbPath(customDbPath);
    const dbPath = resolved.activePath;

    if (!resolved.configuredPath) {
      this.logger.warn('No se ha configurado el archivo de Factusol: Sin ruta');
      this.eventBus?.addEvent('warn', '⚠️ Base de datos Factusol no configurada.');
      return false;
    }

    if (!resolved.exists) {
      this.logger.warn(`No existe o no está accesible el archivo de Factusol (Desconectado/Offline): ${dbPath}`);
      this.eventBus?.addEvent('warn', `⚠️ Base de datos Factusol no accesible (Desconectado/Offline): ${path.basename(dbPath) || dbPath}`);
      return false;
    }

    try {
      if (this.factusol) {
        await this.factusol.disconnect();
      }

      this.factusol = new FactusolConnector();
      await this.factusol.connect({ configuration: this.buildConnectorConfig(dbPath) });

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

  /**
   * F1: devuelve un conector SIEMPRE apuntando al ejercicio activo. Si no hay conector o el abierto corresponde a
   * un ejercicio anterior (cambio de año con el agente en marcha), se reconecta. `null` => offline / sin configurar.
   */
  public async ensureConnector(): Promise<FactusolConnector | null> {
    const resolved = this.resolveActiveDbPath();
    if (!resolved.configuredPath || !resolved.exists) return this.factusol;
    const current = this.factusol?.getActiveDatabasePath();
    if (this.factusol && current && path.resolve(current).toLowerCase() === path.resolve(resolved.activePath).toLowerCase()) {
      return this.factusol;
    }
    if (this.factusol) {
      this.logger.info(`Factusol: el ejercicio activo cambió (${current} → ${resolved.activePath}); reconectando.`);
    }
    await this.connect();
    return this.factusol;
  }

  public async disconnect(): Promise<void> {
    if (this.factusol) {
      await this.factusol.disconnect();
      this.factusol = null;
    }
  }

  private isDemoMode(dbPathInput?: string): boolean {
    const cfg = this.configManager.get();
    const settings = this.getSettings();
    const raw = String(dbPathInput || settings.databasePath || cfg.factusolDbPath || '').trim().toUpperCase();
    return raw.startsWith('DEMO') || settings.evaluationMode;
  }

  public async testConnection(dbPathInput: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number; resolvedPath?: string }> {
    if (this.isDemoMode(dbPathInput)) {
      return {
        success: true,
        message: '🧪 Modo Evaluación Activo (Factusol): 6 artículos de demostración en memoria.',
        articleCount: 6,
        fileSizeBytes: 0,
        resolvedPath: 'DEMO://factusol',
      };
    }
    let dbPath = FactusolPathResolver.cleanPath(dbPathInput);
    if (!dbPath) {
      return { success: false, message: 'La ruta especificada no existe en el sistema.' };
    }

    // Auto-resolver si el usuario introdujo una carpeta
    const resolved = FactusolPathResolver.resolve(dbPath);
    if (resolved.success && resolved.resolvedPath) {
      dbPath = resolved.resolvedPath;
    } else if (!fs.existsSync(dbPath)) {
      const uncFallback = FactusolPathResolver.resolveMappedDriveToUnc(dbPath);
      if (uncFallback && fs.existsSync(uncFallback)) {
        dbPath = uncFallback;
      }
    }

    if (!fs.existsSync(dbPath)) {
      return {
        success: false,
        message: `La ruta especificada no existe en el sistema: '${dbPathInput}'. Si es una unidad de red mapeada (ej: X:\\\\), comprueba que esté accesible o introduce la ruta UNC directa (ej: \\\\\\\\SERVIDOR\\\\Datos\\\\...).`,
      };
    }
    const ext = path.extname(dbPath).toLowerCase();
    if (ext !== '.accdb' && ext !== '.mdb') {
      return { success: false, message: 'El archivo debe ser una base de datos Microsoft Access (.accdb o .mdb).' };
    }

    // F1: se prueba el ejercicio activo (el que el conector abrirá realmente), no el año configurado.
    // La ruta persistida (resolvedPath) sigue siendo la elegida por el usuario; solo la prueba usa el ejercicio activo.
    const active = this.resolveActiveDbPath(dbPath);
    const testedPath = active.exists ? active.activePath : dbPath;

    try {
      const stats = fs.statSync(testedPath);
      const driver = new AccessDriver({ databasePath: testedPath });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      const count = (rows && rows.length > 0 && typeof rows[0]?.total === 'number') ? rows[0]!.total : 0;

      return {
        success: true,
        message: `Conexión exitosa. Se detectaron ${count.toLocaleString('es-ES')} artículos.${active.switchedYear ? ` (ejercicio activo: ${path.basename(testedPath)})` : ''}`,
        articleCount: count,
        fileSizeBytes: stats.size,
        resolvedPath: dbPath !== dbPathInput.trim() ? dbPath : undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Fallo al conectar con Factusol: ${msg}` };
    }
  }

  public async reconnect(dbPath: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number; resolvedPath?: string }> {
    const testResult = await this.testConnection(dbPath);
    if (!testResult.success) {
      this.eventBus?.addEvent('error', `Error conectando Factusol: ${testResult.message}`);
      return testResult;
    }

    await this.disconnect();
    const finalDbPath = testResult.resolvedPath || FactusolPathResolver.cleanPath(dbPath);
    this.configManager.setFactusolDbPath(finalDbPath);
    await this.connect(finalDbPath);

    this.eventBus?.addEvent('success', `✓ Base de datos Factusol reconectada: ${path.basename(finalDbPath)}`);
    return testResult;
  }

  public async getArticleCount(customDbPath?: string): Promise<number | undefined> {
    if (this.isDemoMode(customDbPath)) return 6;
    const active = this.resolveActiveDbPath(customDbPath);
    if (!active.configuredPath || !active.exists) return undefined;

    try {
      const driver = new AccessDriver({ databasePath: active.activePath });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      if (rows && rows.length > 0 && typeof rows[0]?.total === 'number') {
        return rows[0]!.total;
      }
      return undefined;
    } catch (err) {
      this.logger.warn(`No se pudo contar artículos de Factusol: ${String(err)}`);
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
      source: 'defaults',
    };

    const active = this.resolveActiveDbPath(customDbPath);
    if (!active.configuredPath) return defaultRes;
    if (!active.exists) return { ...defaultRes, offline: true };

    try {
      const driver = new AccessDriver({ databasePath: active.activePath });
      let tariffs = defaultRes.tariffs;
      let warehouses = defaultRes.warehouses;
      let fromDb = false;

      try {
        const tRows = await driver.query<{ CODTAR: any; DESTAR: any }>('SELECT CODTAR, DESTAR FROM F_TAR');
        if (tRows && tRows.length > 0) {
          tariffs = tRows.map((r) => ({
            code: String(r.CODTAR || '').trim(),
            name: `${String(r.CODTAR || '').trim()}: ${String(r.DESTAR || '').trim() || 'Tarifa'}`,
          }));
          fromDb = true;
        }
      } catch (err) {
        this.logger.warn(`No se pudieron leer las tarifas (F_TAR): ${String(err)}`);
      }

      try {
        const aRows = await driver.query<{ CODALM: any; NOMALM: any }>('SELECT CODALM, NOMALM FROM F_ALM');
        if (aRows && aRows.length > 0) {
          warehouses = aRows.map((r) => ({
            code: String(r.CODALM || '').trim(),
            name: `${String(r.CODALM || '').trim()}: ${String(r.NOMALM || '').trim() || 'Almacén'}`,
          }));
          fromDb = true;
        }
      } catch (err) {
        this.logger.warn(`No se pudieron leer los almacenes (F_ALM): ${String(err)}`);
      }

      return { tariffs, warehouses, series: defaultRes.series, source: fromDb ? 'database' : 'defaults' };
    } catch (err) {
      this.logger.warn(`No se pudieron leer los metadatos de Factusol: ${String(err)}`);
      return defaultRes;
    }
  }

  /**
   * Mapa de stock para el stock reactivo. F2: política única (suma DISSTO de todos los almacenes salvo almacén
   * configurado distinto de GEN, sin `OR 'GEN'` ni fallback sin filtro). F1: abre el ejercicio activo.
   * F3/F9: offline o error de lectura => lanza (nunca devuelve un mapa vacío que parezca "stock 0").
   */
  public async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    const active = this.resolveActiveDbPath();
    if (!active.configuredPath) throw new FactusolOfflineError('Factusol no está configurado (sin ruta de base de datos).');
    if (!active.exists) throw new FactusolOfflineError(`Base de datos Factusol no accesible (Desconectado/Offline): ${active.activePath}`);

    const settings = this.getSettings();
    // los llamadores pueden pasar el código ya escapado para SQL (comillas duplicadas): se normaliza antes de re-sanear
    const warehouse = resolveStockWarehouse(String(warehouseCode || settings.warehouseCode).replace(/''/g, "'"));
    const driver = new AccessDriver({ databasePath: active.activePath });
    const rows = await driver.query<{ ARTSTO: any; totalStock: any }>(buildStockSumQuery(warehouse));

    if (rows.length === 0 && warehouse) {
      // Almacén configurado sin ninguna fila: ¿no existe o realmente no tiene stock? Si F_STO tiene datos, es configuración errónea.
      const any = await driver.query<{ ALMSTO: any }>('SELECT TOP 1 ALMSTO FROM F_STO');
      if (any.length > 0) {
        throw new Error(`El almacén de stock configurado '${warehouse}' no tiene ninguna fila en F_STO de Factusol (revise warehouseCode).`);
      }
    }

    const map = new Map<string, number>();
    for (const row of rows) {
      const sku = String(row.ARTSTO || '').trim().toUpperCase();
      if (sku) map.set(sku, normalizeStockQuantity(row.totalStock));
    }
    return map;
  }

  public async getPreviewArticles(customDbPath?: string, limit = 25): Promise<ArticlePreviewResult> {
    if (this.isDemoMode(customDbPath)) {
      const demo: ArticlePreviewItem[] = [
        { code: 'DEMO-001', description: 'Taladro Percutor Profesional 850W (Demo)', family: 'HER', costPrice: 45, salePrice: 79.9, stock: 24, ean: '8412345678901' },
        { code: 'DEMO-002', description: 'Juego de Destornilladores Aislados 1000V (Demo)', family: 'HER', costPrice: 14, salePrice: 24.5, stock: 40, ean: '8412345678902' },
        { code: 'DEMO-003', description: 'Disco de Corte Diamante 115mm Turbo (Demo)', family: 'ABR', costPrice: 5.2, salePrice: 9.95, stock: 120, ean: '8412345678903' },
        { code: 'DEMO-004', description: 'Guantes de Protección Nitrilo Talla L (Demo)', family: 'EPI', costPrice: 1.8, salePrice: 3.5, stock: 200, ean: '8412345678904' },
        { code: 'DEMO-005', description: 'Silicona Neutra Profesional Blanca 300ml (Demo)', family: 'QUI', costPrice: 3.1, salePrice: 5.9, stock: 85, ean: '8412345678905' },
        { code: 'DEMO-006', description: 'Flexómetro Magnético 5m x 25mm (Demo)', family: 'MED', costPrice: 4.5, salePrice: 8.75, stock: 60, ean: '8412345678906' },
      ].slice(0, limit);
      return { articles: demo, total: demo.length };
    }
    const active = this.resolveActiveDbPath(customDbPath);
    if (!active.configuredPath) return { articles: [], total: 0 };
    if (!active.exists) return { articles: [], total: 0, offline: true, error: 'Base de datos Factusol no accesible (Desconectado/Offline)' };

    try {
      const settings = this.getSettings();
      const driver = new AccessDriver({ databasePath: active.activePath });
      const query = `SELECT TOP ${Math.max(1, Math.min(limit, 100))} CODART, DESART, FAMART, PCOART, EANART FROM F_ART WHERE CODART <> '' ORDER BY CODART`;
      const artRows = await driver.query<{ CODART: string; DESART: string; FAMART: string; PCOART: number; EANART: string }>(query);

      const stockMap = new Map<string, number>();
      const priceMap = new Map<string, number>();
      const tariffCode = settings.tariffCode;
      const safeTariff = sanitizeAndTruncate(tariffCode, 5);
      const isNumericTariff = /^\d+$/.test(safeTariff);
      const tariffCond = isNumericTariff
        ? `(TARLTA = ${safeTariff} OR CStr(TARLTA) = '${safeTariff}')`
        : `CStr(TARLTA) = '${safeTariff}'`;

      // F13/F3: mismo criterio de stock que el catálogo (SUM DISSTO, política única) y sin tragarse errores.
      if (artRows.length > 0) {
        const codes = artRows.map((r) => String(r.CODART || '').trim());
        const sRows = await driver.query<{ ARTSTO: string; totalStock: number }>(
          buildStockSumQuery(settings.warehouseCode, codes)
        );
        for (const s of sRows) {
          stockMap.set(String(s.ARTSTO || '').trim(), normalizeStockQuantity(s.totalStock));
        }

        const inList = codes.map((c) => `'${sanitizeAndTruncate(c, 13)}'`).join(',');
        const pRows = await driver.query<{ ARTLTA: string; PRELTA: number }>(
          `SELECT ARTLTA, PRELTA FROM F_LTA WHERE ${tariffCond} AND ARTLTA IN (${inList})`
        );
        for (const p of pRows) {
          priceMap.set(String(p.ARTLTA || '').trim(), Number(p.PRELTA) || 0);
        }
      }

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
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudo cargar vista previa de artículos: ${msg}`);
      return { articles: [], total: 0, error: msg };
    }
  }
}
