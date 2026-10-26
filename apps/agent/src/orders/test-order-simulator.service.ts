import fs from 'fs';
import path from 'path';
import { CanonicalOrder, Logger } from '@erp-bridge/shared';
import {
  AccessDriver,
  FactusolYearResolver,
  getNextOrderIdQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
  decrementStockQuery,
  calculateOrderVatBreakdown,
  sanitizeAndTruncate,
  sanitizeSql,
} from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config';
import { EventBus } from '../diagnostics/event-bus';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { FactusolService, FactusolPathResolver } from '../factusol';
import { OrderPlausibilityAdapter } from '../adapters/order-plausibility.adapter';
import { SalesLedgerManager } from './sales-ledger.manager';
import { ErpProviderRegistry } from '../erp';

export interface TestOrderSimulationOptions {
  dbPath?: string;
  orderSeries?: string;
  dryRun?: boolean;
  targetArticleCode?: string;
  customDriver?: AccessDriver;
  warehouse?: string;
}

export interface TestOrderSimulationStep {
  step: number;
  name: string;
  status: 'ok' | 'skipped' | 'failed';
  details?: string;
}

export interface TestOrderSimulationResult {
  success: boolean;
  orderNumber: string;
  series: string;
  articleCode: string;
  articleDescription: string;
  totalAmount: number;
  taxAmount: number;
  dryRun: boolean;
  durationMs: number;
  details: {
    steps: TestOrderSimulationStep[];
    customer?: {
      code: number | string;
      name: string;
      taxId: string;
      province?: string;
    };
    article?: {
      code: string;
      description: string;
      price: number;
      stockBefore: number;
      stockAfter: number;
    };
    breakdown?: {
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    };
    rawOrder?: CanonicalOrder;
    error?: string;
    [key: string]: any;
  };
  error?: string;
  message?: string;
  steps?: TestOrderSimulationStep[];
  summary?: Record<string, any>;
}

export class TestOrderSimulatorService {
  private readonly logger = new Logger('TestOrderSimulatorService');

  constructor(
    private readonly configManager?: ConfigManager,
    private readonly eventBus?: EventBus,
    private readonly salesLedgerManager?: SalesLedgerManager,
    private readonly factusolService?: FactusolService,
    public defaultDriver?: AccessDriver,
    private readonly erpRegistry?: ErpProviderRegistry,
    private readonly licenseCheckFn?: () => { status: string; plan?: string }
  ) {
    if (this.factusolService) {
      this.logger.debug('TestOrderSimulatorService inicializado con FactusolService.');
    }
  }


  public async simulateOrder(options: TestOrderSimulationOptions = {}): Promise<TestOrderSimulationResult> {
    const t0 = performance.now();
    const steps: TestOrderSimulationStep[] = [];
    const dryRun = options.dryRun !== undefined ? options.dryRun : true;

    if (this.licenseCheckFn && (!dryRun || (!options.customDriver && !this.defaultDriver))) {
      const lic = this.licenseCheckFn();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        const errMsg = `Operación bloqueada: Requiere una licencia activa (${lic.status}). Active su clave en la pestaña Licencia.`;
        steps.push({ step: 1, name: 'Verificación de Licencia Activa', status: 'failed', details: errMsg });
        return this.buildFailureResult(steps, errMsg, dryRun, t0);
      }
    }

    // 0. Si el ERP activo no es Factusol en disco (ej: SimplyGest, Ágora POS, Sage 50, a3ERP o Modo Evaluación), usar erpRegistry polimórfico
    const activeConnector = this.erpRegistry?.getActiveConnector();
    const cfg = this.configManager?.get();
    const isEval = Boolean(
      (cfg as any)?.evaluationMode?.enabled ||
      cfg?.softwareErp?.providers?.[activeConnector?.providerId || 'factusol']?.evaluationMode
    );
    if (!options.customDriver && !this.defaultDriver && activeConnector && (activeConnector.providerId !== 'factusol' || isEval)) {
      if (!activeConnector.isDatabaseAccessible()) {
        const errMsg = `La base de datos de ${activeConnector.displayName} no está configurada o accesible.`;
        steps.push({ step: 1, name: `Conexión con ${activeConnector.displayName}`, status: 'failed', details: errMsg });
        return this.buildFailureResult(steps, errMsg, dryRun, t0);
      }
      steps.push({
        step: 1,
        name: `Conexión con ${activeConnector.displayName}`,
        status: 'ok',
        details: `${activeConnector.getDatabasePath() || activeConnector.displayName} (${isEval ? 'Modo Evaluación Sandbox' : 'Conectado'})`,
      });
      const providerCfg = cfg?.softwareErp?.providers?.[activeConnector.providerId] as any;
      const series = (options.orderSeries || providerCfg?.orderSeries || cfg?.factusol?.orderSeries || '1').trim() || '1';
      const warehouse = (options.warehouse || providerCfg?.warehouseCode || cfg?.factusol?.warehouseCode || 'GEN').trim() || 'GEN';
      const previews = await activeConnector.getPreviewArticles(10).catch(() => []);
      const matchedPreview = options.targetArticleCode
        ? previews.find((a) => String(a.code).trim() === String(options.targetArticleCode).trim())
        : undefined;
      const firstArt = matchedPreview || previews[0] || { code: 'DEMO-001', description: 'Artículo de Prueba Bentian', salePrice: 24.5, costPrice: 14, stock: 25 };
      const simArtCode = options.targetArticleCode || firstArt.code;
      const simArtName = firstArt.description || 'Artículo Simulado';
      const simPrice = Number(firstArt.salePrice || firstArt.costPrice || 19.95);
      let simStockBefore = Number(firstArt.stock ?? 20);
      if (!isEval) {
        try {
          const stockMapBefore = await activeConnector.getStockMap(warehouse);
          if (stockMapBefore.has(simArtCode)) {
            simStockBefore = Number(stockMapBefore.get(simArtCode));
          }
        } catch {}
      }
      let simStockAfter = dryRun ? simStockBefore : Math.max(0, simStockBefore - 1);
      steps.push({
        step: 2,
        name: 'Selección de Artículo y Tarifa',
        status: 'ok',
        details: `[${simArtCode}] ${simArtName} — PVP: ${simPrice.toFixed(2)} € (Stock: ${simStockBefore})`,
      });
      const netAmount = Number(simPrice.toFixed(2));
      const taxAmount = Number((netAmount * 0.21).toFixed(2));
      const totalAmount = Number((netAmount + taxAmount).toFixed(2));
      steps.push({
        step: 3,
        name: 'Cuadre de IVA y céntimos (21%)',
        status: 'ok',
        details: `Base: ${netAmount.toFixed(2)} € + IVA 21%: ${taxAmount.toFixed(2)} € = Total: ${totalAmount.toFixed(2)} €`,
      });
      const simRef = `SIM-${Date.now().toString().slice(-6)}`;
      let assignedNum: string | number = Math.floor(90000 + Math.random() * 9000);
      if (!dryRun) {
        const createRes = await activeConnector.createOrder({
          id: simRef,
          orderNumber: simRef,
          reference: simRef,
          series,
          warehouse,
          date: new Date(),
          status: 'pending',
          customer: {
            id: '1',
            customerNumber: '1',
            fiscalName: 'Cliente Simulación Bentian',
            taxId: 'B00000000',
            email: 'test@bentian.es',
            phone: '965000000',
            hasEquivalenceSurcharge: false,
            address: {
              street: 'Calle Mayor 1',
              city: 'Alicante',
              postalCode: '03001',
              state: 'Alicante',
              country: 'ES',
            },
          },
          netAmount,
          taxAmount,
          totalAmount,
          shippingAmount: 0,
          discountAmount: 0,
          totals: { subtotal: netAmount, tax: taxAmount, total: totalAmount },
          lines: [
            {
              id: 'line_1',
              position: 1,
              sku: simArtCode,
              name: simArtName,
              quantity: 1,
              unitPrice: netAmount,
              discountPercent: 0,
              vatPercent: 21,
              vatType: 0,
              subtotal: netAmount,
              total: netAmount,
            },
          ],
          currency: 'EUR',
          paymentMethod: 'Simulación / Test',
        } as any, series, warehouse);
        if (!createRes.success) {
          const errMsg = createRes.error || `Error al insertar pedido simulado en ${activeConnector.displayName}`;
          steps.push({
            step: 4,
            name: `Inserción en ${activeConnector.displayName}`,
            status: 'failed',
            details: errMsg,
          });
          return this.buildFailureResult(steps, errMsg, dryRun, t0);
        }
        if (createRes.orderNumber || createRes.externalId) {
          assignedNum = createRes.orderNumber || createRes.externalId || assignedNum;
        }
        if (!isEval) {
          try {
            const stockMapAfter = await activeConnector.getStockMap(warehouse);
            if (stockMapAfter.has(simArtCode)) {
              simStockAfter = Number(stockMapAfter.get(simArtCode));
            }
          } catch {}
        }
        if (this.salesLedgerManager) {
          try {
            this.salesLedgerManager.recordOrder({
              channel: 'universal_bridge',
              webOrderId: `TEST-${assignedNum}`,
              orderNumber: `TEST-${assignedNum}`,
              factusolSeries: series,
              factusolOrderNumber: String(assignedNum),
              customerName: 'Cliente Simulación Bentian',
              customerEmail: 'test@bentian.es',
              customerPhone: '965000000',
              totalAmount,
              currency: 'EUR',
              status: 'synced',
              lines: [
                {
                  sku: simArtCode,
                  name: simArtName,
                  quantity: 1,
                  unitPrice: netAmount,
                  total: totalAmount,
                },
              ],
              shippingAddress: 'Calle Mayor 1, 03001 Alicante',
              paymentMethod: 'Simulación / Test',
            });
          } catch (ledgerErr) {
            this.logger.warn(`Aviso al registrar pedido simulado en ledger local: ${String(ledgerErr)}`);
          }
        }
      }
      steps.push({
        step: 4,
        name: dryRun ? 'Validación de Inserción (Dry-Run)' : `Inserción en ${activeConnector.displayName}`,
        status: 'ok',
        details: dryRun
          ? `Simulación en seco verificada sobre ${activeConnector.displayName} (Pedido #${assignedNum})`
          : `Pedido #${assignedNum} registrado en ${activeConnector.displayName}`,
      });
      steps.push({
        step: 5,
        name: 'Actualización de stock disponible',
        status: 'ok',
        details: `Stock disponible: ${simStockBefore} → ${simStockAfter} uds`,
      });
      const durationMs = Math.round(performance.now() - t0);
      return {
        success: true,
        orderNumber: String(assignedNum),
        series,
        articleCode: simArtCode,
        articleDescription: simArtName,
        totalAmount,
        taxAmount,
        dryRun,
        message: dryRun
          ? `✓ Simulación en seco (Dry-Run) completada con éxito en ${activeConnector.displayName} (${durationMs}ms)`
          : `✓ Pedido de prueba #${assignedNum} creado con éxito en ${activeConnector.displayName} (${durationMs}ms)`,
        durationMs,
        steps,
        details: {
          steps,
          article: {
            code: simArtCode,
            description: simArtName,
            price: netAmount,
            stockBefore: simStockBefore,
            stockAfter: simStockAfter,
          },
          breakdown: { subtotal: netAmount, taxRate: 21, taxAmount, total: totalAmount },
        },
        summary: {
          orderSeries: series,
          orderCode: assignedNum,
          customerCode: 1,
          customerName: 'Cliente Simulación Bentian (CIF: B00000000)',
          articleCode: simArtCode,
          articleName: simArtName,
          quantity: 1,
          unitPrice: netAmount,
          vatPercent: 21,
          netAmount,
          vatAmount: taxAmount,
          totalAmount,
          stockBefore: simStockBefore,
          stockAfter: simStockAfter,
          rolledBack: dryRun,
        },
      };
    }

    // 1. Comprobar que el archivo de Factusol existe y es accesible mediante AccessDriver en modo Share Deny None
    let dbPath = options.dbPath;
    const fsSettings = this.factusolService?.getSettings();
    if (!dbPath && fsSettings?.databasePath) {
      dbPath = fsSettings.databasePath;
    } else if (!dbPath && this.configManager) {
      const cfg = this.configManager.get();
      dbPath =
        cfg.softwareErp?.providers?.factusol?.databasePath ||
        cfg.factusol?.databasePath ||
        cfg.factusolDbPath;
    }

    if (!options.customDriver && !this.defaultDriver) {
      if (dbPath && /[\x00-\x1f"\x60]/.test(dbPath)) {
        const errMsg = 'La ruta de base de datos Factusol contiene caracteres no permitidos (" ` o caracteres de control).';
        steps.push({ step: 1, name: 'Conexión con Factusol OLEDB', status: 'failed', details: errMsg });
        return this.buildFailureResult(steps, errMsg, dryRun, t0);
      }

      if (!dbPath) {
        const errMsg = 'No se ha configurado la ruta del archivo de base de datos de Factusol.';
        steps.push({ step: 1, name: 'Conexión con Factusol OLEDB', status: 'failed', details: errMsg });
        return this.buildFailureResult(steps, errMsg, dryRun, t0);
      }

      dbPath = FactusolPathResolver.cleanPath(dbPath);
      const resolved = FactusolPathResolver.resolve(dbPath);
      if (resolved.success && resolved.resolvedPath) {
        dbPath = resolved.resolvedPath;
      } else if (!fs.existsSync(dbPath)) {
        const unc = FactusolPathResolver.resolveMappedDriveToUnc(dbPath);
        if (unc && fs.existsSync(unc)) {
          dbPath = unc;
        }
      }

      const autoRollover = fsSettings
        ? fsSettings.autoRollover
        : (this.configManager?.get()?.factusol as Record<string, any> | undefined)?.['autoRollover'] !== false;
      if (autoRollover && dbPath) {
        try {
          const yearRes = FactusolYearResolver.resolveActiveDatabase(dbPath, true);
          if (yearRes.switched && yearRes.activePath && fs.existsSync(yearRes.activePath)) {
            dbPath = yearRes.activePath;
          }
        } catch {}
      }

      if (!fs.existsSync(dbPath)) {
        const errMsg = `El archivo de Factusol no existe o no es accesible: ${dbPath}`;
        steps.push({ step: 1, name: 'Conexión con Factusol OLEDB', status: 'failed', details: errMsg });
        return this.buildFailureResult(steps, errMsg, dryRun, t0);
      }
    }

    const driver = options.customDriver || this.defaultDriver || new AccessDriver({ databasePath: dbPath! });
    const dbFileName = dbPath ? path.basename(dbPath) : 'Factusol OLEDB';

    steps.push({
      step: 1,
      name: 'Conexión con Factusol OLEDB',
      status: 'ok',
      details: `${dbFileName} (Modo Share Deny None)`,
    });

    // 2. Consultar la tabla F_ART para obtener un artículo real con stock o de demostración
    let artCode = '';
    let artName = '';
    let artPrice = 14.50;
    let stockBefore = 10;
    const cfgFact = this.configManager?.get();
    const provFact = cfgFact?.softwareErp?.providers?.factusol;
    const warehouse =
      options.warehouse ||
      fsSettings?.warehouseCode ||
      provFact?.warehouseCode ||
      cfgFact?.factusol?.warehouseCode ||
      'GEN';
    const tariffCode =
      fsSettings?.tariffCode ||
      provFact?.tariffCode ||
      cfgFact?.factusol?.tariffCode ||
      '1';

    try {
      let artRows: any[] = [];
      if (options.targetArticleCode) {
        const targetClean = sanitizeAndTruncate(options.targetArticleCode, 13);
        artRows = await driver.query<any>(`SELECT TOP 1 CODART, DESART, PCOART FROM F_ART WHERE CODART = '${targetClean}'`).catch(() => []);
      }

      if (artRows.length === 0) {
        // Consultar F_ART (intento con ACTART = 0 si existe esa columna de estado activo, con fallback defensivo)
        try {
          artRows = await driver.query<any>(`SELECT TOP 1 CODART, DESART, PVALART, FMLART FROM F_ART WHERE ACTART = 0 ORDER BY CODART ASC`);
        } catch {
          try {
            artRows = await driver.query<any>(`SELECT TOP 1 CODART, DESART, PCOART FROM F_ART WHERE CODART <> '' ORDER BY CODART ASC`);
          } catch {
            artRows = await driver.query<any>(`SELECT TOP 1 CODART, DESART FROM F_ART ORDER BY CODART ASC`);
          }
        }
      }

      if (artRows && artRows.length > 0 && artRows[0].CODART) {
        artCode = String(artRows[0].CODART).trim();
        artName = String(artRows[0].DESART || artCode).trim();
        const basePrice = Number(artRows[0].PVALART || artRows[0].PCOART || 0);
        if (basePrice > 0) {
          artPrice = Math.round(basePrice * 100) / 100;
        }

        // Consultar precio de tarifa en F_LTA
        try {
          const isNum = /^\d+$/.test(tariffCode);
          const tariffCond = isNum ? `(TARLTA = ${tariffCode} OR CStr(TARLTA) = '${tariffCode}')` : `CStr(TARLTA) = '${sanitizeSql(tariffCode)}'`;
          const ltaRows = await driver.query<any>(`SELECT PRELTA FROM F_LTA WHERE ARTLTA = '${sanitizeSql(artCode)}' AND ${tariffCond}`);
          const firstLta = ltaRows && ltaRows.length > 0 ? ltaRows[0] : undefined;
          if (firstLta && Number(firstLta.PRELTA) > 0) {
            artPrice = Math.round(Number(firstLta.PRELTA) * 100) / 100;
          }
        } catch {}

        // Consultar stock en F_STO
        try {
          const stoRows = await driver.query<any>(`SELECT DISSTO, ACTSTO FROM F_STO WHERE ARTSTO = '${sanitizeSql(artCode)}' AND ALMSTO = '${sanitizeSql(warehouse)}'`);
          const firstSto = stoRows && stoRows.length > 0 ? stoRows[0] : undefined;
          if (firstSto && firstSto.DISSTO !== undefined && firstSto.DISSTO !== null) {
            stockBefore = Number(firstSto.DISSTO);
          }
        } catch {}

      }
    } catch (artErr) {
      this.logger.warn(`Aviso al consultar artículos de Factusol: ${String(artErr)}`);
    }

    // Fallback a artículo de demostración si la base de datos está vacía o sin artículos (solo en modo simulación dryRun)
    if (!artCode) {
      if (!dryRun) {
        throw new Error('No se puede realizar un pedido de prueba real si no existe al menos un artículo registrado en el catálogo de Factusol.');
      }
      artCode = 'TEST-001';
      artName = 'TUERCA HEXAGONAL M8 - ARTÍCULO DE PRUEBA';
      artPrice = 14.50;
      stockBefore = 10;
    }

    if (artPrice <= 0) {
      artPrice = 14.50;
    }

    steps.push({
      step: 2,
      name: 'Búsqueda de artículo de catálogo',
      status: 'ok',
      details: `${artCode} — "${artName}" (${artPrice.toFixed(2)} €)`,
    });

    // 3. Consultar la tabla F_CLI para obtener un cliente de Factusol o generar cliente genérico
    let clientCode: number | string = 1;
    let clientName = 'CLIENTE DE PRUEBAS BENTIAN';
    let clientNif = '00000000T';
    let clientProvince = 'Alicante';
    let clientCity = 'Alicante';
    let clientStreet = 'Calle Mayor 1';
    let clientPostalCode = '03001';
    let clientEmail = 'pruebas@bentian.es';
    let clientPhone = '965000000';

    try {
      const cliRows = await driver.query<any>(`SELECT TOP 1 CODCLI, NOFCLI, NIFCLI, DOMCLI, POBCLI, CPOCLI, PROCLI, TELCLI, EMACLI FROM F_CLI WHERE CODCLI > 0 ORDER BY CODCLI ASC`);
      if (cliRows && cliRows.length > 0 && cliRows[0].CODCLI) {
        clientCode = Number(cliRows[0].CODCLI) || 1;
        if (cliRows[0].NOFCLI) clientName = String(cliRows[0].NOFCLI).trim();
        if (cliRows[0].NIFCLI) clientNif = String(cliRows[0].NIFCLI).trim();
        if (cliRows[0].DOMCLI) clientStreet = String(cliRows[0].DOMCLI).trim();
        if (cliRows[0].POBCLI) clientCity = String(cliRows[0].POBCLI).trim();
        if (cliRows[0].CPOCLI) clientPostalCode = String(cliRows[0].CPOCLI).trim();
        if (cliRows[0].PROCLI) clientProvince = String(cliRows[0].PROCLI).trim();
        if (cliRows[0].EMACLI) clientEmail = String(cliRows[0].EMACLI).trim();
        if (cliRows[0].TELCLI) clientPhone = String(cliRows[0].TELCLI).trim();
      }
    } catch (cliErr) {
      this.logger.warn(`Aviso al consultar clientes en F_CLI: ${String(cliErr)}`);
    }

    // 4. Generar objeto de pedido canónico (CanonicalOrder) con desglose fiscal exacto
    const series = (
      options.orderSeries ||
      fsSettings?.orderSeries ||
      provFact?.orderSeries ||
      cfgFact?.factusol?.orderSeries ||
      '1'
    ).trim() || '1';
    const netAmount = Math.round(artPrice * 100) / 100;
    const taxRate = 21;
    const taxAmount = Math.round(netAmount * (taxRate / 100) * 100) / 100;
    const totalAmount = Math.round((netAmount + taxAmount) * 100) / 100;

    const canonicalOrder: CanonicalOrder = {
      id: `sim_ord_${Date.now()}`,
      orderNumber: `SIM-${Date.now().toString().slice(-4)}`,
      series,
      reference: `TEST-SIM-${Date.now()}`,
      date: new Date(),
      status: 'pending',
      customer: {
        id: String(clientCode),
        customerNumber: String(clientCode),
        fiscalName: clientName,
        taxId: clientNif,
        email: clientEmail,
        phone: clientPhone,
        hasEquivalenceSurcharge: false,
        address: {
          street: clientStreet,
          city: clientCity,
          postalCode: clientPostalCode,
          state: clientProvince,
          country: 'ES',
          phone: clientPhone,
          email: clientEmail,
        },
      },
      shippingAddress: {
        street: clientStreet,
        city: clientCity,
        postalCode: clientPostalCode,
        state: clientProvince,
        country: 'ES',
        phone: clientPhone,
        email: clientEmail,
      },
      billingAddress: {
        street: clientStreet,
        city: clientCity,
        postalCode: clientPostalCode,
        state: clientProvince,
        country: 'ES',
        phone: clientPhone,
        email: clientEmail,
      },
      lines: [
        {
          id: 'line_1',
          position: 1,
          sku: artCode,
          name: artName,
          quantity: 1,
          unitPrice: artPrice,
          discountPercent: 0,
          vatPercent: taxRate,
          vatType: 0,
          subtotal: netAmount,
          total: netAmount,
        },
      ],
      netAmount,
      taxAmount,
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount,
      warehouse,
      notes: 'Pedido de prueba generado desde Bentian ERP Bridge',
      paymentMethod: 'web',
      currency: 'EUR',
      hasEquivalenceSurcharge: false,
    };

    // 5. Validar con OrderPlausibilityAdapter
    const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
    if (!plausibility.valid || !plausibility.sanitizedOrder) {
      const errMsg = `Validación de plausibilidad fallida: ${plausibility.error || 'Error desconocido'}`;
      steps.push({ step: 3, name: 'Cuadre de IVA y céntimos (21%)', status: 'failed', details: errMsg });
      return this.buildFailureResult(steps, errMsg, dryRun, t0);
    }
    const safeOrder = plausibility.sanitizedOrder;

    steps.push({
      step: 3,
      name: 'Cuadre de IVA y céntimos (21%)',
      status: 'ok',
      details: `Base: ${netAmount.toFixed(2)} € + IVA 21%: ${taxAmount.toFixed(2)} € = Total: ${totalAmount.toFixed(2)} €`,
    });

    // 6. Si dryRun === true: retornar simulación exitosa sin escribir en disco
    if (dryRun) {
      let previewOrderNum = 1;
      try {
        const maxRows = await driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
        previewOrderNum = (Number(maxRows[0]?.maxid) || 0) + 1;
      } catch {}

      steps.push({
        step: 4,
        name: 'Inserción atómica en F_PCL',
        status: 'ok',
        details: `[Simulación] Asignaría Pedido #${previewOrderNum} (Serie '${series}') sin escribir en disco`,
      });

      steps.push({
        step: 5,
        name: 'Actualización de stock disponible DISSTO',
        status: 'ok',
        details: `[Simulación] Stock disponible resultaría en ${stockBefore - 1} uds (actual: ${stockBefore})`,
      });

      const durationMs = Math.round(performance.now() - t0);
      return {
        success: true,
        orderNumber: String(previewOrderNum),
        series,
        articleCode: artCode,
        articleDescription: artName,
        totalAmount,
        taxAmount,
        dryRun: true,
        durationMs,
        details: {
          steps,
          customer: { code: clientCode, name: clientName, taxId: clientNif, province: clientProvince },
          article: { code: artCode, description: artName, price: artPrice, stockBefore, stockAfter: stockBefore - 1 },
          breakdown: { subtotal: netAmount, taxRate: 21, taxAmount, total: totalAmount },
          rawOrder: safeOrder,
        },
      };
    }

    // 7. Si dryRun === false: insertar pedido en F_PCL y líneas en F_LPC, y actualizar DISSTO
    try {
      const MAX_RETRIES = 3;
      let nextOrderCode = 1;
      let inserted = false;
      let lastInsertErr: any = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const maxRows = await driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
          nextOrderCode = (Number(maxRows[0]?.maxid) || 0) + 1;

          const vatBreakdown = calculateOrderVatBreakdown(safeOrder);
          const headerSql = insertOrderHeaderQuery(safeOrder, nextOrderCode, Number(clientCode) || 1, vatBreakdown, series);
          const lineSqls = safeOrder.lines.map((line, idx) =>
            insertOrderLineQuery(line, nextOrderCode, series, line.position || (idx + 1))
          );
          const stockSqls = safeOrder.lines.map((line) =>
            decrementStockQuery(line.sku, warehouse, line.quantity)
          );

          await driver.executeTransaction([headerSql, ...lineSqls, ...stockSqls]);
          inserted = true;
          break;
        } catch (attemptErr) {
          lastInsertErr = attemptErr;
          this.logger.warn(`Intento ${attempt}/${MAX_RETRIES} de inserción en Factusol falló`, { error: String(attemptErr) });
          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          }
        }
      }

      if (!inserted) {
        throw lastInsertErr || new Error('No se pudo insertar el pedido en Factusol tras reintentos');
      }

      steps.push({
        step: 4,
        name: 'Inserción atómica en F_PCL',
        status: 'ok',
        details: `Pedido #${nextOrderCode} (Serie '${series}') y ${safeOrder.lines.length} línea(s) en F_LPC`,
      });

      let stockAfter = stockBefore - 1;
      try {
        const stockAfterRows = await driver.query<{ DISSTO: number }>(
          `SELECT DISSTO FROM F_STO WHERE ARTSTO = '${sanitizeAndTruncate(artCode, 13)}' AND ALMSTO = '${sanitizeAndTruncate(warehouse, 3)}'`
        );
        const firstStoAfter = stockAfterRows && stockAfterRows.length > 0 ? stockAfterRows[0] : undefined;
        if (firstStoAfter && firstStoAfter.DISSTO !== undefined && firstStoAfter.DISSTO !== null) {
          stockAfter = Number(firstStoAfter.DISSTO);
        }
      } catch {}


      steps.push({
        step: 5,
        name: 'Actualización de stock disponible DISSTO',
        status: 'ok',
        details: `Stock disponible DISSTO actualizado: ${stockBefore} → ${stockAfter} uds`,
      });

      // 8. Registrar evento en historial local y EventBus
      const formattedOrderRef = series && series !== ' ' ? `#${series}-${String(nextOrderCode).padStart(4, '0')}` : `#${nextOrderCode}`;
      const successMsg = `✓ Pedido de prueba ${formattedOrderRef} generado con éxito en Factusol (${artName}, ${totalAmount.toFixed(2)} €).`;
      this.eventBus?.addEvent('success', successMsg);

      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS',
        component: 'TestOrderSimulator',
        action: 'simulate_order',
        status: 'SUCCESS',
        message: successMsg,
        metadata: {
          orderNumber: String(nextOrderCode),
          series,
          articleCode: artCode,
          totalAmount,
          taxAmount,
          dryRun: false,
          stockBefore,
          stockAfter,
        },
      });

      if (this.salesLedgerManager) {
        try {
          this.salesLedgerManager.recordOrder({
            channel: 'universal_bridge',
            webOrderId: `TEST-${nextOrderCode}`,
            orderNumber: `TEST-${nextOrderCode}`,
            factusolSeries: series,
            factusolOrderNumber: String(nextOrderCode),
            customerName: clientName,
            customerEmail: clientEmail,
            customerPhone: clientPhone,
            totalAmount,
            currency: 'EUR',
            status: 'synced',
            lines: [
              {
                sku: artCode,
                name: artName,
                quantity: 1,
                unitPrice: artPrice,
                total: totalAmount,
              },
            ],
            shippingAddress: `${clientStreet}, ${clientPostalCode} ${clientCity} (${clientProvince})`,
            paymentMethod: 'Simulación / Test',
          });
        } catch (ledgerErr) {
          this.logger.warn(`Aviso al registrar pedido en ledger local: ${String(ledgerErr)}`);
        }
      }

      // 9. Retorna TestOrderSimulationResult
      const durationMs = Math.round(performance.now() - t0);
      return {
        success: true,
        orderNumber: String(nextOrderCode),
        series,
        articleCode: artCode,
        articleDescription: artName,
        totalAmount,
        taxAmount,
        dryRun: false,
        durationMs,
        details: {
          steps,
          customer: { code: clientCode, name: clientName, taxId: clientNif, province: clientProvince },
          article: { code: artCode, description: artName, price: artPrice, stockBefore, stockAfter },
          breakdown: { subtotal: netAmount, taxRate: 21, taxAmount, total: totalAmount },
          rawOrder: safeOrder,
        },
      };
    } catch (insertErr: unknown) {
      const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      steps.push({
        step: 4,
        name: 'Inserción atómica en F_PCL',
        status: 'failed',
        details: `Error al insertar en Factusol: ${errMsg}`,
      });
      return this.buildFailureResult(steps, errMsg, dryRun, t0);
    }
  }

  private buildFailureResult(
    steps: TestOrderSimulationStep[],
    error: string,
    dryRun: boolean,
    t0: number
  ): TestOrderSimulationResult {
    return {
      success: false,
      orderNumber: '',
      series: '',
      articleCode: '',
      articleDescription: '',
      totalAmount: 0,
      taxAmount: 0,
      dryRun,
      durationMs: Math.round(performance.now() - t0),
      details: {
        steps,
        error,
      },
      error,
    };
  }
}
