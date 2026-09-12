const http = require('http');
const url = require('url');

const PORT = process.env.SANDBOX_PORT || 8088;

// Estado en memoria del Sandbox de WooCommerce
let products = [
  {
    id: 101,
    name: 'DERIVACION DOBLE 67º PVC SAN.',
    sku: '001455',
    price: '13.46',
    regular_price: '13.46',
    stock_quantity: 0,
    manage_stock: true,
    stock_status: 'outofstock',
  },
  {
    id: 102,
    name: 'CODO 90º PVC SANITARIO',
    sku: '001341',
    price: '0.40',
    regular_price: '0.40',
    stock_quantity: 0,
    manage_stock: true,
    stock_status: 'outofstock',
  },
  {
    id: 103,
    name: 'M. TUBO PVC ENC 16/160 MM.',
    sku: '000047',
    price: '17.85',
    regular_price: '17.85',
    stock_quantity: 0,
    manage_stock: true,
    stock_status: 'outofstock',
  },
  {
    id: 104,
    name: 'ARTICULO SUMINISTROS 1',
    sku: '0067471',
    price: '24.50',
    regular_price: '24.50',
    stock_quantity: 0,
    manage_stock: true,
    stock_status: 'outofstock',
  }
];

let orders = [
  {
    id: 501,
    number: '501',
    status: 'processing',
    currency: 'EUR',
    date_created: new Date().toISOString(),
    total: '26.92',
    total_tax: '4.67',
    shipping_total: '0.00',
    payment_method: 'redsys',
    payment_method_title: 'Tarjeta de Crédito (Redsys)',
    customer_note: 'Por favor dejar en el portal si no estoy.',
    billing: {
      first_name: 'Cristian',
      last_name: 'Jimenez',
      company: 'Bentian Solutions',
      address_1: 'Calle Gran Vía 28',
      city: 'Madrid',
      state: 'Madrid',
      postcode: '28013',
      country: 'ES',
      email: 'cristian@bentian.es',
      phone: '612345678'
    },
    shipping: {
      first_name: 'Cristian',
      last_name: 'Jimenez',
      company: 'Bentian Solutions',
      address_1: 'Calle Gran Vía 28',
      city: 'Madrid',
      state: 'Madrid',
      postcode: '28013',
      country: 'ES'
    },
    line_items: [
      {
        id: 1,
        name: 'DERIVACION DOBLE 67º PVC SAN.',
        product_id: 101,
        sku: '001455',
        quantity: 2,
        subtotal: '22.25',
        total: '22.25',
        total_tax: '4.67',
        price: 13.46
      }
    ]
  }
];

let activityLogs = [];

function logActivity(action, details) {
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    time: new Date().toLocaleTimeString('es-ES', { hour12: false }),
    action,
    details
  };
  activityLogs.unshift(entry);
  if (activityLogs.length > 100) activityLogs.pop();
  console.log(`[WOO MOCK ${entry.time}] ${action}: ${typeof details === 'object' ? JSON.stringify(details) : details}`);
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers para permitir llamadas de cualquier origen local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. System Status (health check para ping de WooCommerce)
  if (pathname === '/wp-json/wc/v3/system_status') {
    logActivity('System Status Ping', 'Agent comprobó estado de WooCommerce');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      environment: {
        version: '8.5.0',
        wp_version: '6.4.2',
        php_version: '8.2.14',
      },
      database: { ok: true }
    }));
    return;
  }

  // 2. Batch Products Update (Stock Sync)
  if ((pathname === '/wp-json/wc/v3/products/batch') && (method === 'POST' || method === 'PUT')) {
    const body = await parseJsonBody(req);
    const updates = body.update || [];
    const updatedResults = [];

    for (const item of updates) {
      // Buscar por ID o SKU
      let prod = products.find(p => p.id === item.id || (item.sku && p.sku === item.sku));
      if (prod) {
        if (item.stock_quantity !== undefined) {
          prod.stock_quantity = Number(item.stock_quantity);
          prod.stock_status = prod.stock_quantity > 0 ? 'instock' : 'outofstock';
        }
        if (item.regular_price !== undefined) {
          prod.regular_price = String(item.regular_price);
          prod.price = String(item.regular_price);
        }
        updatedResults.push(prod);
        logActivity('Stock Actualizado', `SKU ${prod.sku} ('${prod.name}') -> ${prod.stock_quantity} uds.`);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ update: updatedResults }));
    return;
  }

  // 3. Products List & Search
  if (pathname === '/wp-json/wc/v3/products' && method === 'GET') {
    const skuQuery = parsedUrl.query.sku;
    if (skuQuery) {
      const match = products.filter(p => p.sku.toLowerCase() === String(skuQuery).toLowerCase());
      logActivity('Buscar Producto por SKU', `Query: ${skuQuery} (Encontrados: ${match.length})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(match));
      return;
    }
    logActivity('Listado de Productos', `Devolviendo ${products.length} productos`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(products));
    return;
  }

  // 4. Orders List (Order Pull)
  if (pathname === '/wp-json/wc/v3/orders' && method === 'GET') {
    const status = parsedUrl.query.status;
    let filtered = orders;
    if (status) {
      filtered = orders.filter(o => o.status === status);
    }
    logActivity('Consultar Pedidos', `Status: ${status || 'todos'} (Encontrados: ${filtered.length})`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(filtered));
    return;
  }

  // 5. Update Order Status (Mark as completed / add metadata)
  if (pathname.startsWith('/wp-json/wc/v3/orders/') && (method === 'PUT' || method === 'POST')) {
    const idStr = pathname.split('/').pop();
    const orderId = Number(idStr);
    const body = await parseJsonBody(req);
    const order = orders.find(o => o.id === orderId);

    if (order) {
      if (body.status) order.status = body.status;
      if (body.meta_data) {
        order.meta_data = [...(order.meta_data || []), ...body.meta_data];
      }
      logActivity('Pedido Actualizado', `Pedido #${orderId} nuevo estado: '${order.status}'`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(order));
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'woocommerce_rest_order_invalid_id', message: 'Pedido no encontrado' }));
      return;
    }
  }

  // 6. Sandbox Action: Crear Pedido Simulado (desde la web UI o API)
  if (pathname === '/api/sandbox/create-order' && method === 'POST') {
    const newId = 500 + orders.length + 1;
    const randomSku = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const unitPrice = Number(randomSku.price);
    const subtotal = (qty * unitPrice).toFixed(2);
    const tax = (Number(subtotal) * 0.21).toFixed(2);
    const total = (Number(subtotal) + Number(tax)).toFixed(2);

    const newOrder = {
      id: newId,
      number: String(newId),
      status: 'processing',
      currency: 'EUR',
      date_created: new Date().toISOString(),
      total,
      total_tax: tax,
      shipping_total: '0.00',
      payment_method: 'redsys',
      payment_method_title: 'Tarjeta de Crédito (Redsys)',
      customer_note: 'Pedido de prueba generado en Sandbox',
      billing: {
        first_name: 'Cliente',
        last_name: `Prueba ${newId}`,
        company: 'Suministros Demo SL',
        address_1: 'Avenida de la Industria 14',
        city: 'Villarrobledo',
        state: 'Albacete',
        postcode: '02600',
        country: 'ES',
        email: `cliente${newId}@test.com`,
        phone: '600000000'
      },
      shipping: {
        first_name: 'Cliente',
        last_name: `Prueba ${newId}`,
        company: 'Suministros Demo SL',
        address_1: 'Avenida de la Industria 14',
        city: 'Villarrobledo',
        state: 'Albacete',
        postcode: '02600',
        country: 'ES'
      },
      line_items: [
        {
          id: 1,
          name: randomSku.name,
          product_id: randomSku.id,
          sku: randomSku.sku,
          quantity: qty,
          subtotal,
          total: subtotal,
          total_tax: tax,
          price: unitPrice
        }
      ]
    };

    orders.unshift(newOrder);
    logActivity('Nuevo Pedido Creado', `Pedido #${newId} por ${total}€ (Artículo: ${randomSku.sku} x ${qty})`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, order: newOrder }));
    return;
  }

  // 7. Sandbox Action: Reset Stock
  if (pathname === '/api/sandbox/reset-stock' && method === 'POST') {
    products.forEach(p => {
      p.stock_quantity = 0;
      p.stock_status = 'outofstock';
    });
    logActivity('Reset Stock', 'Todo el stock del catálogo reseteado a 0');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Stock reseteado' }));
    return;
  }

  // 8. Sandbox State API
  if (pathname === '/api/sandbox/state' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ products, orders, activityLogs }));
    return;
  }

  // 9. Interactive Web Dashboard
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bentian — Laboratorio Sandbox WooCommerce</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="min-h-screen p-6">
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-800 pb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            WooCommerce Mock Sandbox
            <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Activo (Puerto ${PORT})</span>
          </h1>
          <p class="text-xs text-zinc-400 mt-0.5">Entorno de pruebas local para sincronización bidireccional con Bentian Agent</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="createTestOrder()" class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Simular Pedido de Cliente
        </button>
        <button onclick="resetStock()" class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition">
          Reset Stock a 0
        </button>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
      <div class="space-y-1">
        <div class="text-xs font-semibold text-zinc-300">Configuración para Bentian Agent (Centro de Control):</div>
        <div class="text-xs text-zinc-400 font-mono flex items-center gap-4">
          <span>URL Tienda: <b class="text-white">http://127.0.0.1:${PORT}</b></span>
          <span>Consumer Key: <b class="text-white">ck_sandbox_bentian</b></span>
          <span>Consumer Secret: <b class="text-white">cs_sandbox_bentian</b></span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs text-emerald-400 font-medium flex items-center gap-1.5 justify-end">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          REST API v3 Ready
        </span>
      </div>
    </div>

    <!-- Grid 2 Columnas: Productos & Pedidos -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Productos -->
      <div class="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white flex items-center justify-between">
          <span>Catálogo de Productos y Stock</span>
          <span id="prod-count" class="text-xs text-zinc-500 font-normal"></span>
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th class="pb-2">SKU</th>
                <th class="pb-2">Nombre</th>
                <th class="pb-2">Precio</th>
                <th class="pb-2 text-right">Stock Actual</th>
              </tr>
            </thead>
            <tbody id="products-table" class="divide-y divide-zinc-800/60 text-zinc-300">
              <tr><td colspan="4" class="py-4 text-center text-zinc-500">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pedidos -->
      <div class="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white flex items-center justify-between">
          <span>Cola de Pedidos (WooCommerce)</span>
          <span id="order-count" class="text-xs text-zinc-500 font-normal"></span>
        </h2>
        <div class="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th class="pb-2">ID</th>
                <th class="pb-2">Cliente</th>
                <th class="pb-2">Total</th>
                <th class="pb-2">Pago</th>
                <th class="pb-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody id="orders-table" class="divide-y divide-zinc-800/60 text-zinc-300">
              <tr><td colspan="5" class="py-4 text-center text-zinc-500">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Registro de Actividad en Vivo -->
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white">Registro de Actividad en Tiempo Real (Llamadas del Agente)</h2>
        <span class="text-xs text-zinc-500">Auto-refresh cada 2s</span>
      </div>
      <div id="logs-container" class="font-mono text-xs text-zinc-400 max-h-[220px] overflow-y-auto space-y-1.5 p-3 bg-zinc-950/70 rounded-lg border border-zinc-800/80">
        <div>Esperando interacciones de Bentian Agent...</div>
      </div>
    </div>
  </div>

  <script>
    async function loadState() {
      try {
        const res = await fetch('/api/sandbox/state');
        const data = await res.json();
        
        // Render Products
        document.getElementById('prod-count').textContent = data.products.length + ' artículos';
        const pTable = document.getElementById('products-table');
        pTable.innerHTML = data.products.map(p => \`
          <tr class="hover:bg-zinc-800/40">
            <td class="py-2.5 font-mono text-violet-400 font-medium">\${p.sku}</td>
            <td class="py-2.5 truncate max-w-[180px]">\${p.name}</td>
            <td class="py-2.5">\${p.price}€</td>
            <td class="py-2.5 text-right font-mono font-bold \${p.stock_quantity > 0 ? 'text-emerald-400' : 'text-zinc-500'}">
              \${p.stock_quantity}
            </td>
          </tr>
        \`).join('');

        // Render Orders
        document.getElementById('order-count').textContent = data.orders.length + ' pedidos';
        const oTable = document.getElementById('orders-table');
        oTable.innerHTML = data.orders.map(o => \`
          <tr class="hover:bg-zinc-800/40">
            <td class="py-2 font-mono text-white font-bold">#\${o.id}</td>
            <td class="py-2 truncate max-w-[120px]">\${o.billing.first_name} \${o.billing.last_name}</td>
            <td class="py-2 font-mono">\${o.total}€</td>
            <td class="py-2 uppercase text-[10px] text-zinc-400">\${o.payment_method}</td>
            <td class="py-2 text-right">
              <span class="px-2 py-0.5 text-[10px] rounded-full \${
                o.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-zinc-700/50 text-zinc-400'
              }">\${o.status}</span>
            </td>
          </tr>
        \`).join('');

        // Render Logs
        const logsDiv = document.getElementById('logs-container');
        if (data.activityLogs.length === 0) {
          logsDiv.innerHTML = '<div class="text-zinc-600">No hay llamadas recientes registradas.</div>';
        } else {
          logsDiv.innerHTML = data.activityLogs.map(l => \`
            <div class="flex gap-2">
              <span class="text-zinc-600">[\${l.time}]</span>
              <span class="text-violet-400 font-semibold">\${l.action}:</span>
              <span class="text-zinc-300">\${typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}</span>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('Error loading state:', err);
      }
    }

    async function createTestOrder() {
      await fetch('/api/sandbox/create-order', { method: 'POST' });
      loadState();
    }

    async function resetStock() {
      await fetch('/api/sandbox/reset-stock', { method: 'POST' });
      loadState();
    }

    setInterval(loadState, 2000);
    loadState();
  </script>
</body>
</html>`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado en WooCommerce Sandbox' }));
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`   WOOCOMMERCE MOCK SANDBOX INICIADO`);
  console.log(`   URL REST API:  http://127.0.0.1:${PORT}`);
  console.log(`   PANEL VISUAL:  http://127.0.0.1:${PORT}/`);
  console.log(`======================================================\n`);
});
