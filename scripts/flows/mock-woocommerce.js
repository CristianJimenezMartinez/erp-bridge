const http = require('http');

class MockWooCommerceServer {
  constructor(port = 8090) {
    this.port = port;
    this.server = null;
    this.products = new Map(); // id -> product
    this.productsBySku = new Map(); // sku -> product
    this.orders = new Map(); // id -> order
    this.nextProductId = 1000;
    this.nextOrderId = 500;
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });
      this.server.listen(this.port, () => {
        console.log(`[Mock WooCommerce] Escuchando en http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {}

      res.setHeader('Content-Type', 'application/json');

      // 1. Batch products (create / update / stock)
      if (req.method === 'POST' && url.pathname === '/wp-json/wc/v3/products/batch') {
        const created = [];
        const updated = [];

        if (data.create && Array.isArray(data.create)) {
          for (const item of data.create) {
            const id = this.nextProductId++;
            const product = { id, ...item };
            this.products.set(id, product);
            if (item.sku) this.productsBySku.set(item.sku, product);
            created.push(product);
          }
        }

        if (data.update && Array.isArray(data.update)) {
          for (const item of data.update) {
            let existing = this.products.get(item.id);
            if (!existing && item.sku) existing = this.productsBySku.get(item.sku);
            if (existing) {
              Object.assign(existing, item);
              updated.push(existing);
            } else {
              const id = item.id || this.nextProductId++;
              const product = { id, ...item };
              this.products.set(id, product);
              if (item.sku) this.productsBySku.set(item.sku, product);
              updated.push(product);
            }
          }
        }

        res.writeHead(200);
        return res.end(JSON.stringify({ create: created, update: updated }));
      }

      // 2. Orders list
      if (req.method === 'GET' && url.pathname === '/wp-json/wc/v3/orders') {
        const status = url.searchParams.get('status') || 'processing';
        const list = Array.from(this.orders.values()).filter(o => !status || o.status === status);
        res.writeHead(200);
        return res.end(JSON.stringify(list));
      }

      // 3. Create Order
      if (req.method === 'POST' && url.pathname === '/wp-json/wc/v3/orders') {
        const id = this.nextOrderId++;
        const order = {
          id,
          number: String(id),
          status: data.status || 'processing',
          date_created: new Date().toISOString(),
          total: data.total || '0.00',
          billing: data.billing || {},
          shipping: data.shipping || {},
          line_items: data.line_items || [],
          meta_data: data.meta_data || []
        };
        this.orders.set(id, order);
        res.writeHead(201);
        return res.end(JSON.stringify(order));
      }

      // 4. Update / Get Order (e.g. status)
      const orderMatch = url.pathname.match(/\/wp-json\/wc\/v3\/orders\/(\d+)/);
      if (orderMatch) {
        const id = parseInt(orderMatch[1], 10);
        const existing = this.orders.get(id);
        if (req.method === 'GET') {
          if (existing) {
            res.writeHead(200);
            return res.end(JSON.stringify(existing));
          } else {
            res.writeHead(404);
            return res.end(JSON.stringify({ code: 'woocommerce_rest_cannot_view', message: 'Pedido no encontrado' }));
          }
        }
        if (req.method === 'PUT') {
          if (existing) {
            Object.assign(existing, data);
            res.writeHead(200);
            return res.end(JSON.stringify(existing));
          } else {
            res.writeHead(404);
            return res.end(JSON.stringify({ code: 'woocommerce_rest_cannot_view', message: 'Pedido no encontrado' }));
          }
        }
      }

      // 4b. Get Single Product
      const productMatch = url.pathname.match(/\/wp-json\/wc\/v3\/products\/(\d+)/);
      if (req.method === 'GET' && productMatch) {
        const id = parseInt(productMatch[1], 10);
        const existing = this.products.get(id);
        if (existing) {
          res.writeHead(200);
          return res.end(JSON.stringify(existing));
        } else {
          res.writeHead(404);
          return res.end(JSON.stringify({ code: 'woocommerce_rest_cannot_view', message: 'Producto no encontrado' }));
        }
      }

      // 4c. List Products
      if (req.method === 'GET' && url.pathname === '/wp-json/wc/v3/products') {
        const list = Array.from(this.products.values());
        res.writeHead(200);
        return res.end(JSON.stringify(list));
      }

      // 5. Health & Reset
      if (url.pathname === '/health') {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'ok', totalProducts: this.products.size, totalOrders: this.orders.size }));
      }

      if (url.pathname === '/reset') {
        this.products.clear();
        this.productsBySku.clear();
        this.orders.clear();
        this.nextProductId = 1000;
        this.nextOrderId = 500;
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'reset_ok' }));
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
    });
  }
}

module.exports = { MockWooCommerceServer };

if (require.main === module) {
  const server = new MockWooCommerceServer(8090);
  server.start();
}
