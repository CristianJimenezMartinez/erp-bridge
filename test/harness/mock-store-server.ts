import http from 'http';
import { URL } from 'url';

export interface AuditedRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  pathname: string;
  query: Record<string, string>;
  headers: http.IncomingHttpHeaders;
  body: any;
  responseStatus: number;
  responseBody?: any;
  durationMs: number;
}

export interface FaultRule {
  type: 'status' | 'socket_drop' | 'timeout';
  statusCode?: number; // 500, 503, 429, etc.
  remainingTimes?: number; // if undefined or null, applies indefinitely
  pathMatch?: string | RegExp;
  method?: string;
  message?: string;
}

export interface LatencyRule {
  pathMatch?: string | RegExp;
  method?: string;
  delayMs: number;
}

export interface MockStoreServerOptions {
  port?: number;
  host?: string;
  defaultLatencyMs?: number;
}

export class MockStoreServer {
  private server: http.Server | null = null;
  private readonly port: number;
  private readonly host: string;
  private activeSockets = new Set<import('net').Socket>();

  // In-memory data store
  public products = new Map<number, any>();
  public productsBySku = new Map<string, any>();
  public orders = new Map<number, any>();
  public stockBySku = new Map<string, number>();

  // PrestaShop specific in-memory store
  public psProducts = new Map<number, any>();
  public psOrders = new Map<number, any>();
  public psStockAvailables = new Map<number, any>();

  // Auto-increment IDs
  private nextProductId = 1000;
  private nextOrderId = 500;

  // Chaos Injection
  private globalLatencyMs = 0;
  private latencyRules: LatencyRule[] = [];
  private faultRules: FaultRule[] = [];

  // Audit Logging
  private auditLog: AuditedRequest[] = [];
  private requestCounter = 0;

  constructor(options?: MockStoreServerOptions) {
    this.port = options?.port ?? 9876;
    this.host = options?.host ?? '127.0.0.1';
    this.globalLatencyMs = options?.defaultLatencyMs ?? 0;
  }

  public getPort(): number {
    return this.port;
  }

  public getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleIncomingRequest(req, res);
      });

      this.server.on('connection', (socket) => {
        this.activeSockets.add(socket);
        socket.on('close', () => this.activeSockets.delete(socket));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        resolve(this.getUrl());
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const socket of this.activeSockets) {
        socket.destroy();
      }
      this.activeSockets.clear();

      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  // ==========================================
  // Chaos Injection API
  // ==========================================

  public setGlobalLatency(ms: number): this {
    this.globalLatencyMs = ms;
    return this;
  }

  public addLatencyRule(rule: LatencyRule): this {
    this.latencyRules.push(rule);
    return this;
  }

  public addFaultRule(rule: FaultRule): this {
    this.faultRules.push(rule);
    return this;
  }

  public injectFailures(count: number, statusCode = 500, pathMatch?: string | RegExp): this {
    this.faultRules.push({
      type: 'status',
      statusCode,
      remainingTimes: count,
      pathMatch,
      message: `Injected Chaos Failure (${statusCode})`,
    });
    return this;
  }

  public injectSocketDrops(count: number, pathMatch?: string | RegExp): this {
    this.faultRules.push({
      type: 'socket_drop',
      remainingTimes: count,
      pathMatch,
    });
    return this;
  }

  public resetChaos(): this {
    this.globalLatencyMs = 0;
    this.latencyRules = [];
    this.faultRules = [];
    return this;
  }

  // ==========================================
  // Audit Log API
  // ==========================================

  public getAuditLog(): AuditedRequest[] {
    return [...this.auditLog];
  }

  public clearAuditLog(): this {
    this.auditLog = [];
    return this;
  }

  public findRequests(predicate: (req: AuditedRequest) => boolean): AuditedRequest[] {
    return this.auditLog.filter(predicate);
  }

  // ==========================================
  // In-Memory Data Seeding API
  // ==========================================

  public seedProducts(prods: any[]): this {
    for (const p of prods) {
      const id = p.id || this.nextProductId++;
      const item = { ...p, id };
      this.products.set(id, item);
      if (item.sku) {
        this.productsBySku.set(String(item.sku).trim().toUpperCase(), item);
      }
      if (typeof item.stock_quantity === 'number') {
        this.stockBySku.set(String(item.sku || id).trim().toUpperCase(), item.stock_quantity);
      }
    }
    return this;
  }

  public seedOrders(ords: any[]): this {
    for (const o of ords) {
      const id = o.id || this.nextOrderId++;
      const item = { ...o, id, number: o.number || String(id) };
      this.orders.set(id, item);
    }
    return this;
  }

  public clearData(): this {
    this.products.clear();
    this.productsBySku.clear();
    this.orders.clear();
    this.stockBySku.clear();
    this.psProducts.clear();
    this.psOrders.clear();
    this.psStockAvailables.clear();
    this.nextProductId = 1000;
    this.nextOrderId = 500;
    return this;
  }

  // ==========================================
  // Request Dispatcher & Chaos Handler
  // ==========================================

  private async handleIncomingRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = `req_${++this.requestCounter}`;
    const parsedUrl = new URL(req.url || '/', `http://${this.host}:${this.port}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // Read full request body
    const bodyRaw = await this.readRequestBody(req);
    let parsedBody: any = null;
    if (bodyRaw) {
      try {
        parsedBody = JSON.parse(bodyRaw);
      } catch {
        parsedBody = bodyRaw;
      }
    }

    // Extract query parameters
    const query: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    // 1. Check for Socket Drop or Status Fault
    const faultIndex = this.faultRules.findIndex((f) => this.matchFaultRule(f, pathname, method));
    if (faultIndex >= 0) {
      const fault = this.faultRules[faultIndex]!;
      if (fault.remainingTimes !== undefined) {
        fault.remainingTimes--;
        if (fault.remainingTimes <= 0) {
          this.faultRules.splice(faultIndex, 1);
        }
      }

      if (fault.type === 'socket_drop') {
        this.auditLog.push({
          id: requestId,
          timestamp: startTime,
          method,
          url: req.url || '/',
          pathname,
          query,
          headers: req.headers,
          body: parsedBody,
          responseStatus: 0,
          responseBody: 'SOCKET_DROPPED',
          durationMs: Date.now() - startTime,
        });
        req.socket.destroy();
        return;
      }

      if (fault.type === 'status') {
        const code = fault.statusCode || 500;
        const errPayload = {
          code: code === 429 ? 'woocommerce_rest_rate_limited' : 'internal_server_error',
          message: fault.message || `Simulated error ${code}`,
          data: { status: code },
        };
        res.writeHead(code, {
          'Content-Type': 'application/json',
          ...(code === 429 ? { 'Retry-After': '2' } : {}),
        });
        res.end(JSON.stringify(errPayload));

        this.auditLog.push({
          id: requestId,
          timestamp: startTime,
          method,
          url: req.url || '/',
          pathname,
          query,
          headers: req.headers,
          body: parsedBody,
          responseStatus: code,
          responseBody: errPayload,
          durationMs: Date.now() - startTime,
        });
        return;
      }
    }

    // 2. Apply Latency (Global or Per-Rule)
    let latencyToApply = this.globalLatencyMs;
    for (const lRule of this.latencyRules) {
      if (this.matchLatencyRule(lRule, pathname, method)) {
        latencyToApply = Math.max(latencyToApply, lRule.delayMs);
      }
    }
    if (latencyToApply > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyToApply));
    }

    // 3. Dispatch to Router
    let handled = false;
    let statusCode = 200;
    let responseData: any = null;

    try {
      if (pathname.startsWith('/wp-json/wc/v3/')) {
        const result = await this.handleWooCommerce(pathname, method, query, parsedBody, res);
        handled = result.handled;
        statusCode = result.statusCode;
        responseData = result.data;
      } else if (pathname === '/erp-bridge-endpoint.php') {
        const result = await this.handleUniversalBridge(query, parsedBody, res);
        handled = result.handled;
        statusCode = result.statusCode;
        responseData = result.data;
      } else if (pathname.startsWith('/api/')) {
        const result = await this.handlePrestaShop(pathname, method, query, parsedBody, res);
        handled = result.handled;
        statusCode = result.statusCode;
        responseData = result.data;
      }

      if (!handled) {
        statusCode = 404;
        responseData = { code: 'not_found', message: `Route ${method} ${pathname} not found` };
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      }
    } catch (err: any) {
      statusCode = 500;
      responseData = { code: 'server_error', message: err.message || String(err) };
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      }
    }

    // Record in Audit Log
    this.auditLog.push({
      id: requestId,
      timestamp: startTime,
      method,
      url: req.url || '/',
      pathname,
      query,
      headers: req.headers,
      body: parsedBody,
      responseStatus: statusCode,
      responseBody: responseData,
      durationMs: Date.now() - startTime,
    });
  }

  private matchFaultRule(rule: FaultRule, pathname: string, method: string): boolean {
    if (rule.method && rule.method.toUpperCase() !== method) return false;
    if (!rule.pathMatch) return true;
    if (typeof rule.pathMatch === 'string') return pathname.includes(rule.pathMatch);
    if (rule.pathMatch instanceof RegExp) return rule.pathMatch.test(pathname);
    return false;
  }

  private matchLatencyRule(rule: LatencyRule, pathname: string, method: string): boolean {
    if (rule.method && rule.method.toUpperCase() !== method) return false;
    if (!rule.pathMatch) return true;
    if (typeof rule.pathMatch === 'string') return pathname.includes(rule.pathMatch);
    if (rule.pathMatch instanceof RegExp) return rule.pathMatch.test(pathname);
    return false;
  }

  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }

  // ==========================================
  // WooCommerce API Simulator
  // ==========================================

  private async handleWooCommerce(
    pathname: string,
    method: string,
    query: Record<string, string>,
    body: any,
    res: http.ServerResponse
  ): Promise<{ handled: boolean; statusCode: number; data: any }> {
    const subPath = pathname.replace('/wp-json/wc/v3', '');

    // 1. /products/batch
    if (subPath === '/products/batch' && method === 'POST') {
      const createList = Array.isArray(body?.create) ? body.create : [];
      const updateList = Array.isArray(body?.update) ? body.update : [];
      const deleteList = Array.isArray(body?.delete) ? body.delete : [];

      const created: any[] = [];
      const updated: any[] = [];
      const deleted: any[] = [];

      for (const item of createList) {
        const id = item.id || this.nextProductId++;
        const prod = {
          id,
          name: item.name || 'Producto WooCommerce',
          sku: item.sku || `SKU-${id}`,
          price: String(item.price || item.regular_price || '0'),
          regular_price: String(item.regular_price || item.price || '0'),
          stock_quantity: typeof item.stock_quantity === 'number' ? item.stock_quantity : 0,
          manage_stock: item.manage_stock ?? true,
          stock_status: (item.stock_quantity ?? 0) > 0 ? 'instock' : 'outofstock',
          meta_data: item.meta_data || [],
        };
        this.products.set(id, prod);
        if (prod.sku) this.productsBySku.set(prod.sku.toUpperCase(), prod);
        this.stockBySku.set(prod.sku.toUpperCase(), prod.stock_quantity);
        created.push(prod);
      }

      for (const item of updateList) {
        let existing = item.id ? this.products.get(Number(item.id)) : undefined;
        if (!existing && item.sku) {
          existing = this.productsBySku.get(String(item.sku).toUpperCase());
        }

        if (existing) {
          if (item.name !== undefined) existing.name = item.name;
          if (item.price !== undefined) existing.price = String(item.price);
          if (item.regular_price !== undefined) existing.regular_price = String(item.regular_price);
          if (typeof item.stock_quantity === 'number') {
            existing.stock_quantity = item.stock_quantity;
            existing.stock_status = item.stock_quantity > 0 ? 'instock' : 'outofstock';
            this.stockBySku.set(existing.sku.toUpperCase(), item.stock_quantity);
          }
          if (Array.isArray(item.meta_data)) {
            const currentMeta = existing.meta_data || [];
            for (const m of item.meta_data) {
              const idx = currentMeta.findIndex((x: any) => x.key === m.key);
              if (idx >= 0) currentMeta[idx] = m;
              else currentMeta.push(m);
            }
            existing.meta_data = currentMeta;
          }
          updated.push(existing);
        } else {
          const id = item.id || this.nextProductId++;
          const prod = {
            id,
            name: item.name || 'Producto Actualizado',
            sku: item.sku || `SKU-${id}`,
            price: String(item.price || '0'),
            regular_price: String(item.regular_price || item.price || '0'),
            stock_quantity: typeof item.stock_quantity === 'number' ? item.stock_quantity : 0,
            manage_stock: true,
            stock_status: (item.stock_quantity ?? 0) > 0 ? 'instock' : 'outofstock',
            meta_data: item.meta_data || [],
          };
          this.products.set(id, prod);
          if (prod.sku) this.productsBySku.set(prod.sku.toUpperCase(), prod);
          updated.push(prod);
        }
      }

      for (const delId of deleteList) {
        const id = Number(delId);
        const prod = this.products.get(id);
        if (prod) {
          if (prod.sku) this.productsBySku.delete(prod.sku.toUpperCase());
          this.products.delete(id);
          deleted.push(prod);
        }
      }

      const responsePayload = { create: created, update: updated, delete: deleted };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
      return { handled: true, statusCode: 200, data: responsePayload };
    }

    // 2. /products (GET list, POST create)
    if (subPath === '/products' || subPath === '/products/') {
      if (method === 'GET') {
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const perPage = Math.max(1, parseInt(query.per_page || '10', 10));
        const allProds = Array.from(this.products.values());

        let filtered = allProds;
        if (query.sku) {
          const skuSearch = query.sku.trim().toUpperCase();
          filtered = filtered.filter((p) => String(p.sku || '').toUpperCase() === skuSearch);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / perPage) || 1;
        const startIndex = (page - 1) * perPage;
        const paged = filtered.slice(startIndex, startIndex + perPage);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-WP-Total': String(total),
          'X-WP-TotalPages': String(totalPages),
        });
        res.end(JSON.stringify(paged));
        return { handled: true, statusCode: 200, data: paged };
      }

      if (method === 'POST') {
        const id = body?.id || this.nextProductId++;
        const prod = {
          id,
          name: body?.name || 'Nuevo Producto',
          sku: body?.sku || `SKU-${id}`,
          price: String(body?.price || '0'),
          regular_price: String(body?.regular_price || body?.price || '0'),
          stock_quantity: typeof body?.stock_quantity === 'number' ? body.stock_quantity : 0,
          manage_stock: body?.manage_stock ?? true,
          stock_status: (body?.stock_quantity ?? 0) > 0 ? 'instock' : 'outofstock',
          meta_data: body?.meta_data || [],
        };
        this.products.set(id, prod);
        if (prod.sku) this.productsBySku.set(prod.sku.toUpperCase(), prod);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(prod));
        return { handled: true, statusCode: 201, data: prod };
      }
    }

    // 3. /products/:id (GET, PUT, DELETE)
    const prodMatch = subPath.match(/^\/products\/(\d+)$/);
    if (prodMatch) {
      const id = parseInt(prodMatch[1]!, 10);
      const prod = this.products.get(id);

      if (!prod && method !== 'PUT') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        const err = { code: 'woocommerce_rest_product_invalid_id', message: 'ID no válido' };
        res.end(JSON.stringify(err));
        return { handled: true, statusCode: 404, data: err };
      }

      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(prod));
        return { handled: true, statusCode: 200, data: prod };
      }

      if (method === 'PUT') {
        const target = prod || { id, sku: body?.sku || `SKU-${id}` };
        Object.assign(target, body);
        if (typeof body?.stock_quantity === 'number') {
          target.stock_quantity = body.stock_quantity;
          target.stock_status = body.stock_quantity > 0 ? 'instock' : 'outofstock';
          if (target.sku) this.stockBySku.set(target.sku.toUpperCase(), body.stock_quantity);
        }
        this.products.set(id, target);
        if (target.sku) this.productsBySku.set(target.sku.toUpperCase(), target);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(target));
        return { handled: true, statusCode: 200, data: target };
      }

      if (method === 'DELETE') {
        if (prod?.sku) this.productsBySku.delete(prod.sku.toUpperCase());
        this.products.delete(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(prod));
        return { handled: true, statusCode: 200, data: prod };
      }
    }

    // 4. /orders (GET, POST)
    if (subPath === '/orders' || subPath === '/orders/') {
      if (method === 'GET') {
        const statusFilter = query.status;
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const perPage = Math.max(1, parseInt(query.per_page || '10', 10));

        let list = Array.from(this.orders.values());
        if (statusFilter && statusFilter !== 'any') {
          const statuses = statusFilter.split(',').map((s) => s.trim().toLowerCase());
          list = list.filter((o) => statuses.includes(String(o.status || '').toLowerCase()));
        }

        const total = list.length;
        const totalPages = Math.ceil(total / perPage) || 1;
        const startIndex = (page - 1) * perPage;
        const paged = list.slice(startIndex, startIndex + perPage);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-WP-Total': String(total),
          'X-WP-TotalPages': String(totalPages),
        });
        res.end(JSON.stringify(paged));
        return { handled: true, statusCode: 200, data: paged };
      }

      if (method === 'POST') {
        const id = body?.id || this.nextOrderId++;
        const order = {
          id,
          number: String(id),
          status: body?.status || 'processing',
          currency: body?.currency || 'EUR',
          date_created: body?.date_created || new Date().toISOString(),
          total: String(body?.total || '0.00'),
          total_tax: String(body?.total_tax || '0.00'),
          shipping_total: String(body?.shipping_total || '0.00'),
          payment_method: body?.payment_method || 'card',
          payment_method_title: body?.payment_method_title || 'Tarjeta',
          billing: body?.billing || {},
          shipping: body?.shipping || {},
          line_items: body?.line_items || [],
          meta_data: body?.meta_data || [],
        };
        this.orders.set(id, order);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(order));
        return { handled: true, statusCode: 201, data: order };
      }
    }

    // 5. /orders/:id (GET, PUT, POST update)
    const orderMatch = subPath.match(/^\/orders\/(\d+)$/);
    if (orderMatch) {
      const id = parseInt(orderMatch[1]!, 10);
      let order = this.orders.get(id);

      if (method === 'GET') {
        if (!order) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          const err = { code: 'woocommerce_rest_order_invalid_id', message: 'Pedido no encontrado' };
          res.end(JSON.stringify(err));
          return { handled: true, statusCode: 404, data: err };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(order));
        return { handled: true, statusCode: 200, data: order };
      }

      if (method === 'PUT' || method === 'POST') {
        if (!order) {
          order = { id, number: String(id), meta_data: [] };
        }
        if (body?.status) order.status = body.status;
        if (Array.isArray(body?.meta_data)) {
          const currentMeta = order.meta_data || [];
          for (const m of body.meta_data) {
            const idx = currentMeta.findIndex((x: any) => x.key === m.key);
            if (idx >= 0) currentMeta[idx] = m;
            else currentMeta.push(m);
          }
          order.meta_data = currentMeta;
        }
        this.orders.set(id, order);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(order));
        return { handled: true, statusCode: 200, data: order };
      }
    }

    return { handled: false, statusCode: 404, data: null };
  }

  // ==========================================
  // Universal HTTPS Connector Simulator
  // ==========================================

  private async handleUniversalBridge(
    query: Record<string, string>,
    body: any,
    res: http.ServerResponse
  ): Promise<{ handled: boolean; statusCode: number; data: any }> {
    const action = (query.action || body?.action || '').toLowerCase();

    // 1. ping / health
    if (action === 'ping' || action === 'health') {
      const resp = {
        success: true,
        status: 'ok',
        version: '1.2.0',
        phpVersion: '8.2.14',
        databaseConnected: true,
        tablesReady: true,
        database: {
          connected: true,
          articleCount: this.products.size,
        },
        serverTime: new Date().toISOString(),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    // 2. read_orders / pull_orders
    if (action === 'read_orders' || action === 'pull_orders') {
      const limit = parseInt(query.limit || '50', 10);
      const ordersList = Array.from(this.orders.values()).slice(0, limit);
      const resp = {
        success: true,
        orders: ordersList.map((o) => ({
          id: o.id,
          orderNumber: o.number || String(o.id),
          status: o.status || 'PENDING',
          customer: o.billing || {},
          lines: o.line_items || [],
          paymentMethod: o.payment_method || 'card',
          total: Number(o.total || 0),
          subtotal: Number(o.total || 0) - Number(o.total_tax || 0),
          taxTotal: Number(o.total_tax || 0),
          shippingCost: Number(o.shipping_total || 0),
          createdAt: o.date_created || new Date().toISOString(),
        })),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    // 3. update_order_status / ack_orders
    if (action === 'update_order_status' || action === 'ack_orders') {
      const confirmations = Array.isArray(body?.confirmations) ? body.confirmations : [];
      let count = 0;
      for (const c of confirmations) {
        const id = Number(c.webOrderId || c.id);
        const ord = this.orders.get(id);
        if (ord) {
          ord.status = 'SYNCED';
          ord.factusol_order_number = c.factusolOrderNumber;
          ord.factusol_series = c.factusolSeries;
          count++;
        }
      }
      const resp = { success: true, acknowledged: count };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    // 4. batch_stock / push_stock
    if (action === 'batch_stock' || action === 'push_stock') {
      const updates = Array.isArray(body?.stockUpdates)
        ? body.stockUpdates
        : Array.isArray(body?.updates)
        ? body.updates
        : [];
      let count = 0;
      for (const u of updates) {
        const code = String(u.code || u.sku || '').trim().toUpperCase();
        const stock = Number(u.stock ?? u.quantity ?? 0);
        if (code) {
          this.stockBySku.set(code, stock);
          const existing = this.productsBySku.get(code);
          if (existing) {
            existing.stock_quantity = stock;
            existing.stock_status = stock > 0 ? 'instock' : 'outofstock';
          }
          count++;
        }
      }
      const resp = { success: true, updated: count };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    // 5. update_products / push_catalog
    if (action === 'update_products' || action === 'push_catalog') {
      const products = Array.isArray(body?.products) ? body.products : [];
      let count = 0;
      for (const p of products) {
        const id = p.id || this.nextProductId++;
        const sku = String(p.sku || p.code || `SKU-${id}`).trim().toUpperCase();
        const item = {
          id,
          sku,
          name: p.name || p.description || 'Artículo Universal',
          price: String(p.price || p.priceWithVat || '0'),
          vat_rate: Number(p.vatRate || 21),
          unit_of_measure: p.unitOfMeasure || 'UNIDADES',
          stock_quantity: typeof p.stock === 'number' ? p.stock : 0,
        };
        this.products.set(id, item);
        this.productsBySku.set(sku, item);
        count++;
      }
      const resp = { success: true, processed: count };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    // 6. catalog / articles
    if (action === 'catalog' || action === 'articles') {
      const items = Array.from(this.products.values()).map((p) => ({
        codart: p.sku || String(p.id),
        desart: p.name,
        pcoart: Number(p.price || 0),
        pvp: Number(p.price || 0) * 1.21,
        stock: this.stockBySku.get(String(p.sku || p.id).toUpperCase()) ?? 0,
      }));
      const resp = { success: true, count: items.length, articles: items };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resp));
      return { handled: true, statusCode: 200, data: resp };
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    const err = { error: `Acción no válida: ${action}` };
    res.end(JSON.stringify(err));
    return { handled: true, statusCode: 400, data: err };
  }

  // ==========================================
  // PrestaShop Web Service Simulator
  // ==========================================

  private async handlePrestaShop(
    pathname: string,
    method: string,
    _query: Record<string, string>,
    body: any,
    res: http.ServerResponse
  ): Promise<{ handled: boolean; statusCode: number; data: any }> {
    const subPath = pathname.replace('/api', '');

    // 1. /api/products
    if (subPath === '/products' || subPath === '/products/') {
      if (method === 'GET') {
        const list = Array.from(this.psProducts.values());
        const resp = { products: list.map((p) => ({ id: p.id, reference: p.reference || p.sku })) };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resp));
        return { handled: true, statusCode: 200, data: resp };
      }

      if (method === 'POST') {
        const pData = body?.product || body;
        const id = this.nextProductId++;
        const prod = { id, reference: pData.reference || `REF-${id}`, ...pData };
        this.psProducts.set(id, prod);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ product: prod }));
        return { handled: true, statusCode: 201, data: { product: prod } };
      }
    }

    const psProdMatch = subPath.match(/^\/products\/(\d+)$/);
    if (psProdMatch) {
      const id = parseInt(psProdMatch[1]!, 10);
      const prod = this.psProducts.get(id);

      if (method === 'GET') {
        if (!prod) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return { handled: true, statusCode: 404, data: { error: 'Product not found' } };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ product: prod }));
        return { handled: true, statusCode: 200, data: { product: prod } };
      }

      if (method === 'PUT') {
        const pData = body?.product || body;
        const updated = { ...prod, ...pData, id };
        this.psProducts.set(id, updated);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ product: updated }));
        return { handled: true, statusCode: 200, data: { product: updated } };
      }
    }

    // 2. /api/orders
    if (subPath === '/orders' || subPath === '/orders/') {
      if (method === 'GET') {
        const list = Array.from(this.psOrders.values());
        const resp = { orders: list };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resp));
        return { handled: true, statusCode: 200, data: resp };
      }

      if (method === 'POST') {
        const oData = body?.order || body;
        const id = this.nextOrderId++;
        const ord = { id, reference: oData.reference || `ORD-${id}`, ...oData };
        this.psOrders.set(id, ord);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ order: ord }));
        return { handled: true, statusCode: 201, data: { order: ord } };
      }
    }

    // 3. /api/stock_availables
    if (subPath === '/stock_availables' || subPath === '/stock_availables/') {
      if (method === 'GET') {
        const list = Array.from(this.psStockAvailables.values());
        const resp = { stock_availables: list };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resp));
        return { handled: true, statusCode: 200, data: resp };
      }
    }

    const psStockMatch = subPath.match(/^\/stock_availables\/(\d+)$/);
    if (psStockMatch) {
      const id = parseInt(psStockMatch[1]!, 10);
      let stockRec = this.psStockAvailables.get(id);

      if (method === 'GET') {
        if (!stockRec) {
          stockRec = { id, id_product: id, id_product_attribute: 0, quantity: 0 };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stock_available: stockRec }));
        return { handled: true, statusCode: 200, data: { stock_available: stockRec } };
      }

      if (method === 'PUT') {
        const sData = body?.stock_available || body;
        stockRec = { ...stockRec, ...sData, id };
        this.psStockAvailables.set(id, stockRec);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ stock_available: stockRec }));
        return { handled: true, statusCode: 200, data: { stock_available: stockRec } };
      }
    }

    return { handled: false, statusCode: 404, data: null };
  }
}
