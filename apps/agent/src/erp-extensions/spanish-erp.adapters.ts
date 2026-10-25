import { CanonicalOrder } from '@erp-bridge/shared';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import {
  ErpArticlePreviewItem,
  ErpCatalogArticle,
  ErpOrderResult,
  ErpTestResult,
  SqlServerBaseAdapter,
  SqlServerConnectionOptions,
} from '../erp';
import { EXTENDED_SQL_PROFILES } from './spanish-erp-profiles';
import { enhanceExtendedSpanishSqlAdapter } from './spanish-local-mdb.helper';
export { BusinessCentralErpAdapter } from './business-central.adapter';

export class Sage200ErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.sage200, configManager, eventBus);
    enhanceExtendedSpanishSqlAdapter(this);
  }
}

export class IcgManagerErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.icg, configManager, eventBus);
    enhanceExtendedSpanishSqlAdapter(this);
  }
}

export class VisionwinErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.visionwin, configManager, eventBus);
    enhanceExtendedSpanishSqlAdapter(this);
  }
}

export class AplifisaErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.aplifisa, configManager, eventBus);
    enhanceExtendedSpanishSqlAdapter(this);
  }
}

/**
 * Conector Híbrido Odoo ERP (v14–v18):
 * - Si serverInstance es una URL HTTP/HTTPS (ej: http://127.0.0.1:8069 o https://mi-odoo.es),
 *   opera mediante el protocolo oficial JSON-RPC (/jsonrpc -> common.authenticate y object.execute_kw)
 *   para catálogo, stock libre (free_qty) e inyección de pedidos completos (sale.order + sale.order.line).
 * - Si es una instancia SQL o Modo Evaluación Sandbox, delega en SqlServerBaseAdapter.
 */
export class OdooErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.odoo, configManager, eventBus);
  }

  private isHttpRpcUrl(instance?: string): boolean {
    const val = String(instance || this.getProviderSettings().serverInstance || '').trim();
    return /^https?:\/\//i.test(val);
  }

  private getCleanBaseUrl(instance?: string): string {
    return String(instance || this.getProviderSettings().serverInstance || 'http://127.0.0.1:8069')
      .trim()
      .replace(/\/+$/, '');
  }

  private async callOdooJsonRpc(baseUrl: string, service: 'common' | 'object', method: string, args: unknown[]): Promise<any> {
    const res = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: { service, method, args },
        id: Date.now(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al conectar con Odoo JSON-RPC en ${baseUrl}`);
    }
    const payload: any = await res.json();
    if (payload.error) {
      const detail = payload.error.data?.message || payload.error.message || JSON.stringify(payload.error);
      throw new Error(`Error Odoo RPC: ${detail}`);
    }
    return payload.result;
  }

  public override async testConnection(dbSpec?: string, overrides?: Partial<SqlServerConnectionOptions>): Promise<ErpTestResult> {
    if (overrides?.evaluationMode || this.isEvaluationMode(dbSpec)) {
      return super.testConnection(dbSpec, overrides);
    }
    const settings = this.getProviderSettings();
    const serverInstance = overrides?.serverInstance || settings.serverInstance || '';
    if (this.isHttpRpcUrl(serverInstance)) {
      const baseUrl = this.getCleanBaseUrl(serverInstance);
      const dbName = overrides?.databaseName || settings.databaseName || 'odoo';
      const user = overrides?.username || settings.username || 'admin';
      const pass = overrides?.password || settings.password || '';
      try {
        const uid = await this.callOdooJsonRpc(baseUrl, 'common', 'authenticate', [dbName, user, pass, {}]);
        if (!uid || typeof uid !== 'number') {
          return {
            success: false,
            message: `Autenticación rechazada en Odoo (${baseUrl}, BD: ${dbName}). Verifica usuario y API Key / contraseña.`,
          };
        }
        const count = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName,
          uid,
          pass,
          'product.product',
          'search_count',
          [[['active', '=', true]]],
        ]);
        return {
          success: true,
          articleCount: Number(count) || 0,
          resolvedPath: `${baseUrl}#db=${dbName}`,
          message: `Conectado a Odoo ERP vía JSON-RPC (${baseUrl} / ${dbName}) — ${Number(count) || 0} productos activos.`,
        };
      } catch (err) {
        return {
          success: false,
          message: `No se pudo conectar a Odoo JSON-RPC (${baseUrl}): ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    return super.testConnection(dbSpec, overrides);
  }

  public override async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    if (this.isEvaluationMode() || !this.isHttpRpcUrl()) {
      return super.getPreviewArticles(limit);
    }
    try {
      const items = await this.fetchOdooCatalogViaRpc(limit);
      return items.map((a) => ({
        code: a.code,
        description: a.name,
        family: a.family,
        stock: a.stock,
        salePrice: a.price,
        costPrice: a.costPrice,
        ean: a.barcode,
      }));
    } catch {
      return [];
    }
  }

  public override async getArticlesForCatalog(limit = 5000): Promise<ErpCatalogArticle[]> {
    if (this.isEvaluationMode() || !this.isHttpRpcUrl()) {
      return super.getArticlesForCatalog(limit);
    }
    try {
      return await this.fetchOdooCatalogViaRpc(limit);
    } catch {
      return [];
    }
  }

  public override async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    if (this.isEvaluationMode() || !this.isHttpRpcUrl()) {
      return super.getStockMap(warehouseCode);
    }
    const map = new Map<string, number>();
    try {
      const items = await this.fetchOdooCatalogViaRpc(5000);
      for (const item of items) {
        map.set(item.code.toUpperCase(), Math.max(0, item.stock));
      }
    } catch {}
    return map;
  }

  public override async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    if (this.isEvaluationMode() || !this.isHttpRpcUrl()) {
      return super.createOrder(order, series, warehouse);
    }
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanBaseUrl(s.serverInstance);
      const dbName = s.databaseName || 'odoo';
      const user = s.username || 'admin';
      const pass = s.password || '';
      const uid = await this.callOdooJsonRpc(baseUrl, 'common', 'authenticate', [dbName, user, pass, {}]);
      if (!uid) {
        return { success: false, error: 'Autenticación fallida en Odoo JSON-RPC al crear pedido.' };
      }

      // 0. Idempotencia: si ya existe un pedido con la misma referencia, devolverlo sin duplicar
      const orderRef = String(order.orderNumber || order.id || '');
      if (orderRef) {
        const existing = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName, uid, pass, 'sale.order', 'search', [[['client_order_ref', '=', orderRef]]], { limit: 1 },
        ]);
        if (Array.isArray(existing) && existing[0]) {
          return { success: true, orderNumber: existing[0], externalId: `SO-${existing[0]}` };
        }
      }

      // 1. Resolver o crear cliente (res.partner)
      const custName = order.customer?.fiscalName || 'Cliente Web';
      const custEmail = order.customer?.email || '';
      let partnerIds: number[] = [];
      if (custEmail) {
        partnerIds = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName, uid, pass, 'res.partner', 'search', [[['email', '=', custEmail]]], { limit: 1 },
        ]);
      }
      let partnerId = Array.isArray(partnerIds) && partnerIds[0] ? Number(partnerIds[0]) : 0;
      if (!partnerId) {
        partnerId = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName, uid, pass, 'res.partner', 'create', [{ name: custName, email: custEmail || false }],
        ]);
      }

      // 2. Construir comandos (0, 0, {...}) de líneas de pedido (sale.order.line)
      const orderLineCommands: any[] = [];
      for (const line of order.lines || []) {
        let prodIds: number[] = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName, uid, pass, 'product.product', 'search', [[['default_code', '=', line.sku]]], { limit: 1 },
        ]);
        if (!Array.isArray(prodIds) || !prodIds[0]) {
          prodIds = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
            dbName, uid, pass, 'product.product', 'search', [[['barcode', '=', line.sku]]], { limit: 1 },
          ]);
        }
        const prodId = Array.isArray(prodIds) && prodIds[0] ? Number(prodIds[0]) : false;
        if (!prodId) {
          return { success: false, error: `SKU ${line.sku} no existe en Odoo (product.product.default_code / barcode); pedido no creado` };
        }
        orderLineCommands.push([
          0,
          0,
          {
            product_id: prodId,
            name: line.name || line.sku,
            product_uom_qty: Number(line.quantity) || 1,
            price_unit: Number(line.unitPrice) || 0,
          },
        ]);
      }

      // 3. Crear sale.order con todas sus líneas en una sola transacción RPC
      const orderId = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
        dbName,
        uid,
        pass,
        'sale.order',
        'create',
        [
          {
            partner_id: partnerId,
            client_order_ref: String(order.orderNumber || order.id || ''),
            note: order.notes || '',
            order_line: orderLineCommands,
          },
        ],
      ]);

      let officialNumber = String(orderId);
      try {
        const orderInfo = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
          dbName, uid, pass, 'sale.order', 'read', [[orderId]], { fields: ['name'] },
        ]);
        if (Array.isArray(orderInfo) && orderInfo[0]?.name) {
          officialNumber = orderInfo[0].name;
        }
      } catch {}

      return { success: true, orderNumber: officialNumber, externalId: `SO-${orderId}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async fetchOdooCatalogViaRpc(limit: number): Promise<ErpCatalogArticle[]> {
    const s = this.getProviderSettings();
    const baseUrl = this.getCleanBaseUrl(s.serverInstance);
    const dbName = s.databaseName || 'odoo';
    const user = s.username || 'admin';
    const pass = s.password || '';
    const uid = await this.callOdooJsonRpc(baseUrl, 'common', 'authenticate', [dbName, user, pass, {}]);
    if (!uid) return [];
    const records: any[] = await this.callOdooJsonRpc(baseUrl, 'object', 'execute_kw', [
      dbName,
      uid,
      pass,
      'product.product',
      'search_read',
      [[['active', '=', true]]],
      {
        fields: ['id', 'default_code', 'name', 'list_price', 'standard_price', 'qty_available', 'free_qty', 'barcode', 'categ_id'],
        limit,
      },
    ]);
    return (records || []).map((r) => ({
      code: String(r.default_code || `ODO-${r.id}`).trim(),
      name: String(r.name || 'Producto Odoo').trim(),
      family: Array.isArray(r.categ_id) && r.categ_id[1] ? String(r.categ_id[1]) : 'GENERAL',
      stock: Math.round(Number(r.free_qty ?? r.qty_available ?? 0)),
      price: Number(r.list_price ?? 0),
      costPrice: Number(r.standard_price ?? 0),
      barcode: r.barcode ? String(r.barcode) : '',
      description: String(r.name || ''),
      raw: r,
    }));
  }
}

/**
 * Conector Híbrido FacturaScripts (API REST v3 + MySQL/PostgreSQL/SQL):
 * - Si serverInstance es una URL HTTP/HTTPS (ej: http://127.0.0.1:8000), usa la API REST v3 oficial
 *   (/api/3/variantes, /api/3/productos, /api/3/stocks, /api/3/crearPedidoCliente) con cabecera Token.
 * - Si es instancia SQL o Modo Evaluación Sandbox, delega en SqlServerBaseAdapter.
 */
export class FacturaScriptsErpAdapter extends SqlServerBaseAdapter {
  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.facturascripts, configManager, eventBus);
  }

  private isHttpApiUrl(instance?: string): boolean {
    const val = String(instance || this.getProviderSettings().serverInstance || '').trim();
    return /^https?:\/\//i.test(val);
  }

  private getCleanBaseUrl(instance?: string): string {
    return String(instance || this.getProviderSettings().serverInstance || 'http://127.0.0.1:8000')
      .trim()
      .replace(/\/+$/, '');
  }

  public override async testConnection(dbSpec?: string, overrides?: Partial<SqlServerConnectionOptions>): Promise<ErpTestResult> {
    if (overrides?.evaluationMode || this.isEvaluationMode(dbSpec)) {
      return super.testConnection(dbSpec, overrides);
    }
    const s = this.getProviderSettings();
    const serverInstance = overrides?.serverInstance || s.serverInstance || '';
    if (this.isHttpApiUrl(serverInstance)) {
      const baseUrl = this.getCleanBaseUrl(serverInstance);
      const apiKey = overrides?.password || s.password || '';
      try {
        const res = await fetch(`${baseUrl}/api/3/productos?limit=50`, {
          headers: { Token: apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          return {
            success: false,
            message: `FacturaScripts API v3 devolvió HTTP ${res.status} en ${baseUrl}/api/3/productos. Verifica tu clave API (Token).`,
          };
        }
        const rows: any[] = (await res.json()) as any[];
        const count = Array.isArray(rows) ? rows.length : 0;
        return {
          success: true,
          articleCount: count,
          resolvedPath: `${baseUrl}/api/3`,
          message: `Conectado a FacturaScripts API REST v3 (${baseUrl}) — ${count} productos verificados.`,
        };
      } catch (err) {
        return {
          success: false,
          message: `No se pudo conectar a FacturaScripts API v3 (${baseUrl}): ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    return super.testConnection(dbSpec, overrides);
  }

  public override async getArticlesForCatalog(limit = 5000): Promise<ErpCatalogArticle[]> {
    if (this.isEvaluationMode() || !this.isHttpApiUrl()) {
      return super.getArticlesForCatalog(limit);
    }
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanBaseUrl(s.serverInstance);
      const apiKey = s.password || '';
      const [prodRes, varRes] = await Promise.all([
        fetch(`${baseUrl}/api/3/productos?limit=${Math.min(limit, 500)}`, {
          headers: { Token: apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${baseUrl}/api/3/variantes?limit=${Math.min(limit, 500)}`, {
          headers: { Token: apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }),
      ]);
      if (!prodRes.ok) return [];
      const productos: any[] = (await prodRes.json()) as any[];
      const variantes: any[] = varRes.ok ? ((await varRes.json()) as any[]) : [];
      const varByRef = new Map<string, any>();
      for (const v of variantes) {
        if (v && v.referencia) varByRef.set(String(v.referencia), v);
      }

      return (productos || []).map((p) => {
        const ref = String(p.referencia || p.idproducto || '').trim();
        const v = varByRef.get(ref) || {};
        return {
          code: ref,
          name: String(p.descripcion || ref).trim(),
          family: String(p.codfamilia || 'GEN').trim(),
          stock: Math.round(Number(v.stockfis ?? p.stockfis ?? 0)),
          price: Number(v.precio ?? p.precio ?? 0),
          costPrice: Number(v.coste ?? 0),
          barcode: String(v.codbarras || '').trim(),
          description: String(p.descripcion || ''),
          raw: { ...p, variante: v },
        };
      });
    } catch {
      return [];
    }
  }

  public override async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    if (this.isEvaluationMode() || !this.isHttpApiUrl()) {
      return super.getStockMap(warehouseCode);
    }
    const map = new Map<string, number>();
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanBaseUrl(s.serverInstance);
      const apiKey = s.password || '';
      const res = await fetch(`${baseUrl}/api/3/stocks?limit=2000`, {
        headers: { Token: apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const rows: any[] = (await res.json()) as any[];
        for (const r of rows || []) {
          const sku = String(r.referencia || '').trim().toUpperCase();
          const disp = Number(r.disponible ?? Number(r.cantidad || 0) - Number(r.reservada || 0));
          if (sku) {
            map.set(sku, Math.max(0, Math.round((map.get(sku) || 0) + disp)));
          }
        }
        return map;
      }
    } catch {}
    return map;
  }

  public override async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    if (this.isEvaluationMode() || !this.isHttpApiUrl()) {
      return super.getPreviewArticles(limit);
    }
    const catalog = await this.getArticlesForCatalog(limit);
    return catalog.slice(0, limit).map((a) => ({
      code: a.code,
      description: a.name,
      family: a.family,
      stock: a.stock,
      salePrice: a.price,
      costPrice: a.costPrice,
      ean: a.barcode,
    }));
  }

  public override async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    if (this.isEvaluationMode() || !this.isHttpApiUrl()) {
      return super.createOrder(order, series, warehouse);
    }
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanBaseUrl(s.serverInstance);
      const apiKey = s.password || '';

      // 1. Resolver o registrar cliente en FacturaScripts si no se especificó un ID explícito
      let codcliente = order.customer?.id;
      if (!codcliente || codcliente === '000001') {
        const nif = (order.customer?.taxId || (order.customer as any)?.nif || (order.customer as any)?.cif || '').trim();
        const email = (order.customer?.email || '').trim();
        const clientName = (order.customer?.fiscalName || order.customer?.commercialName || 'Cliente Web').trim();

        if (nif) {
          try {
            const findRes = await fetch(`${baseUrl}/api/3/clientes?cifnif=${encodeURIComponent(nif)}&limit=1`, {
              headers: { Token: apiKey, Accept: 'application/json' },
              signal: AbortSignal.timeout(4000),
            });
            if (findRes.ok) {
              const matches: any[] = await findRes.json();
              if (Array.isArray(matches) && matches[0]?.codcliente) {
                codcliente = String(matches[0].codcliente);
              }
            }
          } catch {}
        }

        if (!codcliente && (nif || clientName)) {
          try {
            const createParams = new URLSearchParams();
            createParams.set('cifnif', nif || 'B00000000');
            createParams.set('nombre', clientName);
            if (email) createParams.set('email', email);
            const createRes = await fetch(`${baseUrl}/api/3/clientes`, {
              method: 'POST',
              headers: { Token: apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
              body: createParams.toString(),
              signal: AbortSignal.timeout(4000),
            });
            if (createRes.ok) {
              const createdData: any = await createRes.json();
              if (createdData?.data?.codcliente) {
                codcliente = String(createdData.data.codcliente);
              }
            }
          } catch {}
        }
      }

      // Si aún no tenemos codcliente, fallback al primer cliente disponible
      if (!codcliente) {
        try {
          const listRes = await fetch(`${baseUrl}/api/3/clientes?limit=1`, {
            headers: { Token: apiKey, Accept: 'application/json' },
            signal: AbortSignal.timeout(4000),
          });
          if (listRes.ok) {
            const list: any[] = await listRes.json();
            if (Array.isArray(list) && list[0]?.codcliente) {
              codcliente = String(list[0].codcliente);
            }
          }
        } catch {}
      }

      const bodyParams = new URLSearchParams();
      bodyParams.set('codcliente', codcliente || '1');
      bodyParams.set('codserie', series || s.orderSeries || 'A');
      bodyParams.set('codalmacen', warehouse || s.warehouseCode || 'ALG');
      bodyParams.set('coddivisa', order.currency || 'EUR');
      const pm = (order.paymentMethod || '').toLowerCase();
      bodyParams.set('codpago', pm.includes('tarj') ? 'TARJETA' : (pm.includes('trans') ? 'TRANS' : (pm.includes('pay') ? 'PAYPAL' : 'CONT')));
      bodyParams.set('observaciones', `Pedido Web #${order.orderNumber || order.id || ''} - ${order.customer?.fiscalName || ''}`.trim());
      bodyParams.set(
        'lineas',
        JSON.stringify(
          (order.lines || []).map((l) => ({
            referencia: l.sku,
            descripcion: l.name || l.sku,
            cantidad: Number(l.quantity) || 1,
            pvpunitario: Number(l.unitPrice) || 0,
            dtopor: Number(l.discountPercent) || 0,
          }))
        )
      );

      const res = await fetch(`${baseUrl}/api/3/crearPedidoCliente`, {
        method: 'POST',
        headers: {
          Token: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return { success: false, error: `HTTP ${res.status} en FacturaScripts /api/3/crearPedidoCliente: ${errorText.slice(0, 150)}` };
      }
      const data: any = await res.json();
      const docCode = data?.doc?.codigo || data?.codigo || data?.idpedido || Math.floor(Date.now() / 1000);
      return { success: true, orderNumber: docCode, externalId: `FS-${docCode}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
