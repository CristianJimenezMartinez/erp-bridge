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

/**
 * Conector Híbrido Microsoft Dynamics 365 Business Central / Dynamics NAV:
 * 1. Modo Cloud / OData v4 REST API v2.0 (cuando serverInstance empieza por http:// o https://):
 *    - Autodetecta el Company ID en /companies
 *    - Lee catálogo y stock disponible real en /companies({id})/items
 *    - Inyecta pedidos completos (cabecera + líneas) en /companies({id})/salesOrders y /salesOrderLines
 * 2. Modo SQL Server On-Premises (cuando serverInstance es instancia SQL Server):
 *    - Autodetecta el prefijo real [NombreEmpresa$Item] en sys.tables
 *    - Ejecuta transacción T-SQL atómica en [Empresa$Sales Header] + [Empresa$Sales Line]
 */
export class BusinessCentralErpAdapter extends SqlServerBaseAdapter {
  private cachedCompanyId: string | null = null;

  constructor(configManager: ConfigManager, eventBus?: EventBus) {
    super(EXTENDED_SQL_PROFILES.businesscentral, configManager, eventBus);
    enhanceExtendedSpanishSqlAdapter(this);
  }

  private isHttpODataUrl(instance?: string): boolean {
    const val = String(instance || this.getProviderSettings().serverInstance || '').trim();
    return /^https?:\/\//i.test(val);
  }

  private getCleanApiBase(instance?: string): string {
    const base = String(instance || this.getProviderSettings().serverInstance || '')
      .trim()
      .replace(/\/+$/, '');
    // Si el usuario pegó solo el host/entorno, añadir la ruta estándar de la API v2.0.
    if (/^https?:\/\//i.test(base) && !/\/api\//i.test(`${base}/`)) {
      return `${base}/api/v2.0`;
    }
    return base;
  }

  private buildAuthHeaders(user?: string, pass?: string): Record<string, string> {
    const s = this.getProviderSettings();
    const u = (user ?? s.username ?? '').trim();
    const p = (pass ?? s.password ?? '').trim();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (p && (!u || u.toLowerCase() === 'bearer' || p.length > 40)) {
      headers.Authorization = p.startsWith('Bearer ') ? p : `Bearer ${p}`;
    } else if (u && p) {
      headers.Authorization = `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
    }
    return headers;
  }

  private async resolveCompanyId(baseUrl: string, headers: Record<string, string>, preferredName?: string): Promise<string> {
    if (this.cachedCompanyId) return this.cachedCompanyId;
    const res = await fetch(`${baseUrl}/companies`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al consultar /companies en Business Central API (${baseUrl})`);
    }
    const data: any = await res.json();
    const list: any[] = Array.isArray(data?.value) ? data.value : [];
    if (list.length === 0) {
      throw new Error('No se encontraron empresas activas en Business Central (/companies).');
    }
    const targetName = (preferredName || '').trim().toLowerCase();
    const matched =
      list.find((c) => String(c.name || '').toLowerCase() === targetName || String(c.displayName || '').toLowerCase() === targetName) ||
      list[0];
    this.cachedCompanyId = String(matched.id);
    return this.cachedCompanyId;
  }

  public override async testConnection(dbSpec?: string, overrides?: Partial<SqlServerConnectionOptions>): Promise<ErpTestResult> {
    if (overrides?.evaluationMode || this.isEvaluationMode(dbSpec)) {
      return super.testConnection(dbSpec, overrides);
    }
    const s = this.getProviderSettings();
    const serverInstance = overrides?.serverInstance || s.serverInstance || '';
    if (this.isHttpODataUrl(serverInstance)) {
      const baseUrl = this.getCleanApiBase(serverInstance);
      const headers = this.buildAuthHeaders(overrides?.username, overrides?.password);
      try {
        this.cachedCompanyId = null;
        const companyId = await this.resolveCompanyId(baseUrl, headers, overrides?.databaseName || s.databaseName);
        const itemsRes = await fetch(`${baseUrl}/companies(${companyId})/items?$top=100`, {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (!itemsRes.ok) {
          return {
            success: false,
            message: `Business Central API devolvió HTTP ${itemsRes.status} al consultar items.`,
          };
        }
        const payload: any = await itemsRes.json();
        const count = Array.isArray(payload?.value) ? payload.value.length : 0;
        return {
          success: true,
          articleCount: count,
          resolvedPath: `${baseUrl}/companies(${companyId})`,
          message: `Conectado a Dynamics 365 Business Central API v2.0 (Company ${companyId}) — ${count} artículos verificados.`,
        };
      } catch (err) {
        return {
          success: false,
          message: `Error al conectar con Business Central OData API (${baseUrl}): ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    return super.testConnection(dbSpec, overrides);
  }

  public override async getArticlesForCatalog(limit = 5000): Promise<ErpCatalogArticle[]> {
    if (this.isEvaluationMode() || !this.isHttpODataUrl()) {
      return super.getArticlesForCatalog(limit);
    }
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanApiBase(s.serverInstance);
      const headers = this.buildAuthHeaders();
      const companyId = await this.resolveCompanyId(baseUrl, headers, s.databaseName);
      const res = await fetch(`${baseUrl}/companies(${companyId})/items?$top=${Math.min(limit, 1000)}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      const items: any[] = Array.isArray(data?.value) ? data.value : [];
      return items
        .filter((it) => !it.blocked)
        .map((it) => ({
          code: String(it.number || it.id || '').trim(),
          name: String(it.displayName || it.number || '').trim(),
          family: String(it.itemCategoryCode || 'GEN').trim(),
          stock: Math.max(0, Math.round(Number(it.inventory ?? 0))),
          price: Number(it.unitPrice ?? 0),
          costPrice: Number(it.unitCost ?? 0),
          barcode: String(it.gtin || '').trim(),
          description: String(it.displayName || ''),
          raw: it,
        }));
    } catch {
      return [];
    }
  }

  public override async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    if (this.isEvaluationMode() || !this.isHttpODataUrl()) {
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

  public override async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    if (this.isEvaluationMode() || !this.isHttpODataUrl()) {
      return super.getStockMap(warehouseCode);
    }
    const map = new Map<string, number>();
    const items = await this.getArticlesForCatalog(2000);
    for (const item of items) {
      map.set(item.code.toUpperCase(), item.stock);
    }
    return map;
  }

  public override async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    if (this.isEvaluationMode() || !this.isHttpODataUrl()) {
      return super.createOrder(order, series, warehouse);
    }
    try {
      const s = this.getProviderSettings();
      const baseUrl = this.getCleanApiBase(s.serverInstance);
      const headers = this.buildAuthHeaders();
      const companyId = await this.resolveCompanyId(baseUrl, headers, s.databaseName);

      const orderRes = await fetch(`${baseUrl}/companies(${companyId})/salesOrders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerNumber: order.customer?.customerNumber || '10000',
          externalDocumentNumber: String(order.orderNumber || order.id || '').substring(0, 35),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!orderRes.ok) {
        return { success: false, error: `HTTP ${orderRes.status} al crear salesOrder en Business Central` };
      }
      const createdOrder: any = await orderRes.json();
      const orderId = createdOrder.id;
      const docNumber = createdOrder.number || orderId;

      for (const line of order.lines || []) {
        const lineRes = await fetch(`${baseUrl}/companies(${companyId})/salesOrders(${orderId})/salesOrderLines`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            lineType: 'Item',
            lineObjectNumber: line.sku,
            description: line.name || line.sku,
            quantity: Number(line.quantity) || 1,
            unitPrice: Number(line.unitPrice) || 0,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!lineRes.ok) {
          // Evitar cabeceras huérfanas sin líneas: revertir el pedido (mejor esfuerzo).
          await fetch(`${baseUrl}/companies(${companyId})/salesOrders(${orderId})`, {
            method: 'DELETE',
            headers: { ...headers, 'If-Match': '*' },
            signal: AbortSignal.timeout(8000),
          }).catch(() => undefined);
          return {
            success: false,
            error: `HTTP ${lineRes.status} al crear la línea ${line.sku} en Business Central (pedido revertido)`,
          };
        }
      }

      return { success: true, orderNumber: docNumber, externalId: docNumber };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
