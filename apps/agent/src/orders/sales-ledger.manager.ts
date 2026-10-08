import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '@erp-bridge/shared';
import {
  SalesOrderRecord,
  SalesLedgerMetrics,
  GetSalesOrdersOptions,
  PaginatedSalesOrdersResult,
  SalesLedgerDateRange,
} from './sales-ledger.types';

export class SalesLedgerManager {
  private readonly logger = new Logger('SalesLedgerManager');
  private readonly filePath: string;
  private orders: SalesOrderRecord[] = [];

  constructor(baseDir?: string) {
    if (process.env.BENTIAN_SALES_LEDGER_PATH) {
      this.filePath = process.env.BENTIAN_SALES_LEDGER_PATH;
    } else if (process.env.BENTIAN_DATA_DIR) {
      this.filePath = path.join(process.env.BENTIAN_DATA_DIR, 'sales-ledger.json');
    } else if (process.env.BENTIAN_CONFIG_PATH) {
      this.filePath = path.join(path.dirname(process.env.BENTIAN_CONFIG_PATH), 'sales-ledger.json');
    } else if (baseDir) {
      this.filePath = path.join(baseDir, 'sales-ledger.json');
    } else {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      this.filePath = path.join(appData, 'Bentian Agent', 'sales-ledger.json');
    }

    this.orders = this.loadFromDisk();
  }

  public getFilePath(): string {
    return this.filePath;
  }

  private loadFromDisk(): SalesOrderRecord[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      this.logger.warn(`Aviso al cargar historial de ventas: ${err instanceof Error ? err.message : String(err)}`);
    }
    return [];
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.orders, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      this.logger.error(`Error guardando historial de ventas (${this.filePath}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public recordOrder(data: Partial<SalesOrderRecord> & {
    channel: 'woocommerce' | 'universal_bridge';
    webOrderId: string;
  }): SalesOrderRecord {
    const existingIndex = this.orders.findIndex(
      (o) => o.channel === data.channel && String(o.webOrderId) === String(data.webOrderId)
    );
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const existing = this.orders[existingIndex];
      if (existing) {
        const updated: SalesOrderRecord = {
          id: existing.id,
          channel: existing.channel,
          webOrderId: existing.webOrderId,
          orderNumber: String(data.orderNumber || existing.orderNumber),
          date: data.date || existing.date || now,
          factusolSeries: data.factusolSeries || existing.factusolSeries,
          factusolOrderNumber: data.factusolOrderNumber || existing.factusolOrderNumber,
          customerName: data.customerName || existing.customerName,
          customerEmail: data.customerEmail || existing.customerEmail,
          customerPhone: data.customerPhone || existing.customerPhone,
          totalAmount: data.totalAmount !== undefined ? Number(data.totalAmount) : existing.totalAmount,
          currency: data.currency || existing.currency,
          status: data.status || existing.status,
          error: data.status === 'synced' ? undefined : (data.error ?? existing.error),
          lines: data.lines && data.lines.length > 0 ? data.lines : existing.lines,
          shippingAddress: data.shippingAddress || existing.shippingAddress,
          paymentMethod: data.paymentMethod || existing.paymentMethod,
          createdAt: existing.createdAt || now,
          updatedAt: now,
          retryCount: existing.retryCount || 0,
          lastRetriedAt: existing.lastRetriedAt,
        };
        this.orders[existingIndex] = updated;
        this.saveToDisk();
        return updated;
      }
    }

    const newRecord: SalesOrderRecord = {
      id: data.id || `order-${data.channel}-${data.webOrderId}-${Date.now()}`,
      channel: data.channel,
      webOrderId: String(data.webOrderId),
      orderNumber: String(data.orderNumber || data.webOrderId),
      date: data.date || now,
      factusolSeries: data.factusolSeries,
      factusolOrderNumber: data.factusolOrderNumber,
      customerName: data.customerName || 'Cliente Web',
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      totalAmount: Number(data.totalAmount) || 0,
      currency: data.currency || 'EUR',
      status: data.status || 'pending',
      error: data.error,
      lines: data.lines || [],
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
    };

    this.orders.unshift(newRecord);
    if (this.orders.length > 5000) {
      this.orders.pop();
    }
    this.saveToDisk();
    return newRecord;
  }

  public getOrderById(id: string): SalesOrderRecord | null {
    const cleanId = String(id).trim();
    const found = this.orders.find(
      (o) => o.id === cleanId || String(o.webOrderId) === cleanId || String(o.orderNumber) === cleanId
    );
    return found ? { ...found } : null;
  }

  public markOrderRetried(
    id: string,
    newStatus: 'synced' | 'pending' | 'failed',
    error?: string,
    factusolOrderNumber?: string,
    factusolSeries?: string
  ): SalesOrderRecord | null {
    const index = this.orders.findIndex(
      (o) => o.id === id || String(o.webOrderId) === id || String(o.orderNumber) === id
    );
    if (index === -1) return null;

    const existing = this.orders[index];
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated: SalesOrderRecord = {
      id: existing.id,
      channel: existing.channel,
      webOrderId: existing.webOrderId,
      orderNumber: existing.orderNumber,
      date: existing.date,
      customerName: existing.customerName,
      customerEmail: existing.customerEmail,
      customerPhone: existing.customerPhone,
      totalAmount: existing.totalAmount,
      currency: existing.currency,
      lines: existing.lines,
      shippingAddress: existing.shippingAddress,
      paymentMethod: existing.paymentMethod,
      createdAt: existing.createdAt,
      status: newStatus,
      error: newStatus === 'synced' ? undefined : (error || existing.error),
      factusolOrderNumber: factusolOrderNumber || existing.factusolOrderNumber,
      factusolSeries: factusolSeries || existing.factusolSeries,
      retryCount: (existing.retryCount || 0) + 1,
      lastRetriedAt: now,
      updatedAt: now,
    };

    this.orders[index] = updated;
    this.saveToDisk();
    return { ...updated };
  }

  public getMetrics(): SalesLedgerMetrics {
    let totalTodayEur = 0;
    let ordersTodayCount = 0;
    let issuesCount = 0;

    for (const o of this.orders) {
      const orderDateStr = o.date || o.createdAt || '';
      const orderIsToday = this.isDateToday(orderDateStr);

      if (orderIsToday) {
        ordersTodayCount++;
        if (o.status === 'synced') {
          totalTodayEur += Number(o.totalAmount) || 0;
        }
      }

      if (o.status === 'failed') {
        issuesCount++;
      }
    }

    return {
      totalTodayEur: Math.round(totalTodayEur * 100) / 100,
      ordersTodayCount,
      issuesCount,
    };
  }

  public getOrders(options: GetSalesOrdersOptions = {}): PaginatedSalesOrdersResult {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const range = (options.range || 'all') as SalesLedgerDateRange;
    const search = (options.search || '').trim().toLowerCase();
    const status = options.status || 'all';

    let filtered = this.orders;

    // 1. Filtro temporal
    if (range && range !== 'all') {
      filtered = filtered.filter((o) => this.matchesDateRange(o.date || o.createdAt || '', range));
    }

    // 2. Filtro de estado
    if (status && status !== 'all') {
      filtered = filtered.filter((o) => o.status === status);
    }

    // 3. Filtro de búsqueda
    if (search) {
      filtered = filtered.filter((o) => {
        if (o.orderNumber && o.orderNumber.toLowerCase().includes(search)) return true;
        if (o.webOrderId && String(o.webOrderId).toLowerCase().includes(search)) return true;
        if (o.factusolOrderNumber && String(o.factusolOrderNumber).toLowerCase().includes(search)) return true;
        if (o.customerName && o.customerName.toLowerCase().includes(search)) return true;
        if (o.customerEmail && o.customerEmail.toLowerCase().includes(search)) return true;
        if (o.lines && o.lines.some((l) => (l.sku && l.sku.toLowerCase().includes(search)) || (l.name && l.name.toLowerCase().includes(search)))) {
          return true;
        }
        return false;
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginatedOrders = filtered.slice(startIndex, startIndex + limit);

    return {
      orders: paginatedOrders,
      total,
      page,
      totalPages,
      limit,
      metrics: this.getMetrics(),
    };
  }

  private isDateToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  private matchesDateRange(dateStr: string, range: SalesLedgerDateRange): boolean {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();

    switch (range) {
      case 'today':
        return this.isDateToday(dateStr);
      case '7d': {
        const cutoff7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return d.getTime() >= cutoff7;
      }
      case '30d': {
        const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return d.getTime() >= cutoff30;
      }
      case 'month':
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case 'all':
      default:
        return true;
    }
  }
}
