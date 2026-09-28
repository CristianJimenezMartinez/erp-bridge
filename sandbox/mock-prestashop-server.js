/**
 * ============================================================================
 * Bentian ERP Bridge — Servidor Mock de PrestaShop WebService API (Sandbox Lab)
 * ============================================================================
 * Simula el WebService oficial de PrestaShop 1.7 / 8.x / 9.x
 * - Autenticación HTTP Basic con API Key
 * - Formatos JSON y XML (output_format=JSON y Content-Type application/xml)
 * - Recursos: products, stock_availables, orders, customers, order_histories, order_carriers
 * ============================================================================
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PS_PORT || 8089;
const EXPECTED_API_KEY = 'TEST_PS_API_KEY_12345';

// Base de datos en memoria para el laboratorio
let products = [
  {
    id: 1,
    reference: '000001',
    name: [{ id: 1, value: 'TALADRO PERCUTOR INDUSTRIAL 850W' }],
    description: [{ id: 1, value: 'Taladro percutor profesional para taller y obra.' }],
    description_short: [{ id: 1, value: 'Taladro 850W profesional' }],
    price: '89.950000',
    wholesale_price: '55.000000',
    active: '1',
    ean13: '8412345678901',
    weight: '2.500000',
    associations: {
      categories: [{ id: 2 }, { id: 12 }],
      stock_availables: [{ id: 101, id_product_attribute: 0 }],
    },
  },
  {
    id: 2,
    reference: '001341',
    name: [{ id: 1, value: 'DISCO CORTE DIAMANTE 115MM' }],
    description: [{ id: 1, value: 'Disco de corte para amoladora angular.' }],
    description_short: [{ id: 1, value: 'Disco diamante 115' }],
    price: '14.500000',
    wholesale_price: '7.200000',
    active: '1',
    ean13: '8412345678902',
    weight: '0.200000',
    associations: {
      categories: [{ id: 2 }, { id: 15 }],
      stock_availables: [{ id: 102, id_product_attribute: 0 }],
    },
  },
  {
    id: 3,
    reference: '001455',
    name: [{ id: 1, value: 'CAJA TORNILLOS ZINCADOS 4X40 (500 UDS)' }],
    description: [{ id: 1, value: 'Tornillería cincada alta resistencia rosca madera.' }],
    description_short: [{ id: 1, value: 'Tornillo 4x40' }],
    price: '9.250000',
    wholesale_price: '4.100000',
    active: '1',
    ean13: '8412345678903',
    weight: '1.100000',
    associations: {
      categories: [{ id: 2 }],
      stock_availables: [{ id: 103, id_product_attribute: 0 }],
    },
  },
];

let stockAvailables = [
  { id: 101, id_product: 1, id_product_attribute: 0, quantity: 25, depends_on_stock: 0, out_of_stock: 2 },
  { id: 102, id_product: 2, id_product_attribute: 0, quantity: 150, depends_on_stock: 0, out_of_stock: 2 },
  { id: 103, id_product: 3, id_product_attribute: 0, quantity: 80, depends_on_stock: 0, out_of_stock: 2 },
];

let orders = [
  {
    id: 501,
    reference: 'ORD-PS-2026-001',
    id_customer: 42,
    current_state: 2, // 2 = Pago aceptado
    date_add: '2026-09-28 10:15:00',
    total_paid: '113.84',
    total_paid_tax_incl: '113.84',
    total_paid_tax_excl: '94.08',
    total_shipping: '4.95',
    total_shipping_tax_incl: '4.95',
    total_discounts: '0.00',
    associations: {
      order_rows: [
        {
          id: 1,
          product_id: 1,
          product_attribute_id: 0,
          product_quantity: 1,
          product_name: 'TALADRO PERCUTOR INDUSTRIAL 850W',
          product_reference: '000001',
          product_price: '89.95',
          unit_price_tax_excl: '74.34',
          unit_price_tax_incl: '89.95',
          total_price_tax_excl: '74.34',
          total_price_tax_incl: '89.95',
        },
        {
          id: 2,
          product_id: 2,
          product_attribute_id: 0,
          product_quantity: 1,
          product_name: 'DISCO CORTE DIAMANTE 115MM',
          product_reference: '001341',
          product_price: '14.50',
          unit_price_tax_excl: '11.98',
          unit_price_tax_incl: '14.50',
          total_price_tax_excl: '11.98',
          total_price_tax_incl: '14.50',
        },
      ],
    },
  },
  {
    id: 502,
    reference: 'ORD-PS-2026-002',
    id_customer: 88,
    current_state: 3, // 3 = Preparación en curso
    date_add: '2026-09-28 11:30:00',
    total_paid: '37.00',
    total_paid_tax_incl: '37.00',
    total_paid_tax_excl: '30.58',
    total_shipping: '0.00',
    total_shipping_tax_incl: '0.00',
    total_discounts: '0.00',
    associations: {
      order_rows: [
        {
          id: 1,
          product_id: 3,
          product_attribute_id: 0,
          product_quantity: 4,
          product_name: 'CAJA TORNILLOS ZINCADOS 4X40 (500 UDS)',
          product_reference: '001455',
          product_price: '9.25',
          unit_price_tax_excl: '7.64',
          unit_price_tax_incl: '9.25',
          total_price_tax_excl: '30.58',
          total_price_tax_incl: '37.00',
        },
      ],
    },
  },
];

let customers = [
  {
    id: 42,
    firstname: 'Juan',
    lastname: 'García',
    email: 'juan.garcia@ferreteria.es',
    siret: 'B12345678',
    company: 'Ferretería Industrial García S.L.',
  },
  {
    id: 88,
    firstname: 'María',
    lastname: 'Rodríguez',
    email: 'm.rodriguez@obras.es',
    siret: '53444555A',
    company: 'Construcciones Rodríguez',
  },
];

let orderCarriers = [
  { id: 1, id_order: 501, id_carrier: 1, tracking_number: '', weight: '2.700000' },
  { id: 2, id_order: 502, id_carrier: 1, tracking_number: '', weight: '0.800000' },
];
let orderHistories = [];

function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
  const [apiKey] = decoded.split(':');
  return apiKey === EXPECTED_API_KEY;
}

function parseXmlQuantity(xmlStr) {
  const match = xmlStr.match(/<quantity>([0-9-]+)<\/quantity>/);
  if (match) return parseInt(match[1], 10);
  return null;
}

function parseXmlId(xmlStr, tag) {
  const regex = new RegExp(`<${tag}>([0-9]+)<\/${tag}>`);
  const match = xmlStr.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  // Verificación de autenticación
  if (!checkAuth(req)) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="PrestaShop WebService"',
    });
    return res.end(JSON.stringify({ error: '401 Unauthorized: Invalid or missing API Key' }));
  }

  // --- GET /api/products ---
  if (method === 'GET' && pathname === '/api/products') {
    let filtered = [...products];
    if (query['filter[reference]']) {
      const refMatch = query['filter[reference]'].replace(/[\[\]]/g, '');
      filtered = filtered.filter(p => p.reference === refMatch);
    }
    if (query['display'] === '[id]') {
      return res.writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ products: filtered.map(p => ({ id: p.id })) }));
    }
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ products: filtered }));
  }

  // --- GET /api/products/:id ---
  if (method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    const prod = products.find(p => p.id === id);
    if (!prod) {
      return res.writeHead(404, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: `Product ID ${id} not found` }));
    }
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ product: prod }));
  }

  // --- GET /api/stock_availables ---
  if (method === 'GET' && pathname === '/api/stock_availables') {
    let filtered = [...stockAvailables];
    if (query['filter[id_product]']) {
      const prodId = parseInt(query['filter[id_product]'].replace(/[\[\]]/g, ''), 10);
      filtered = filtered.filter(s => s.id_product === prodId);
    }
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ stock_availables: filtered }));
  }

  // --- PUT /api/stock_availables/:id ---
  if (method === 'PUT' && pathname.startsWith('/api/stock_availables/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const stockItem = stockAvailables.find(s => s.id === id);
      if (!stockItem) {
        return res.writeHead(404, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: `stock_available ID ${id} not found` }));
      }
      const newQty = parseXmlQuantity(body);
      if (newQty !== null) {
        stockItem.quantity = newQty;
      }
      return res.writeHead(200, { 'Content-Type': 'application/xml' })
        .end(`<?xml version="1.0" encoding="UTF-8"?><prestashop><stock_available><id>${stockItem.id}</id><id_product>${stockItem.id_product}</id_product><id_product_attribute>${stockItem.id_product_attribute}</id_product_attribute><quantity>${stockItem.quantity}</quantity></stock_available></prestashop>`);
    });
    return;
  }

  // --- POST /module/erpbridge_sync/batch_stock (Micro-módulo acelerador) ---
  if (method === 'POST' && pathname === '/module/erpbridge_sync/batch_stock') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let updatedCount = 0;
        if (Array.isArray(payload.stocks)) {
          payload.stocks.forEach(item => {
            const stock = stockAvailables.find(s => s.id === item.id_stock_available);
            if (stock) {
              stock.quantity = item.quantity;
              updatedCount++;
            }
          });
        }
        return res.writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ success: true, updated: updatedCount }));
      } catch (err) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ success: false, error: String(err) }));
      }
    });
    return;
  }

  // --- GET /api/orders ---
  if (method === 'GET' && pathname === '/api/orders') {
    let filtered = [...orders];
    if (query['filter[current_state]']) {
      const rawStates = query['filter[current_state]'].replace(/[\[\]]/g, '').split(',');
      const states = rawStates.map(s => parseInt(s.trim(), 10));
      filtered = filtered.filter(o => states.includes(o.current_state));
    }
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ orders: filtered }));
  }

  // --- POST /api/order_histories ---
  if (method === 'POST' && pathname === '/api/order_histories') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let orderId = null;
      let stateId = null;
      if (body.trim().startsWith('<')) {
        orderId = parseXmlId(body, 'id_order');
        stateId = parseXmlId(body, 'id_order_state');
      } else {
        try {
          const parsed = JSON.parse(body);
          orderId = parsed.id_order;
          stateId = parsed.id_order_state;
        } catch {}
      }

      if (orderId && stateId) {
        const ord = orders.find(o => o.id === orderId);
        if (ord) {
          ord.current_state = stateId;
        }
        orderHistories.push({ id_order: orderId, id_order_state: stateId, date_add: new Date().toISOString() });
      }

      return res.writeHead(201, { 'Content-Type': 'application/xml' })
        .end(`<?xml version="1.0" encoding="UTF-8"?><prestashop><order_history><id>${orderHistories.length}</id><id_order>${orderId}</id_order><id_order_state>${stateId}</id_order_state></order_history></prestashop>`);
    });
    return;
  }

  // --- GET /api/order_carriers ---
  if (method === 'GET' && pathname === '/api/order_carriers') {
    let filtered = [...orderCarriers];
    if (query['filter[id_order]']) {
      const ordId = parseInt(query['filter[id_order]'].replace(/[\[\]]/g, ''), 10);
      filtered = filtered.filter(c => c.id_order === ordId);
    }
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ order_carriers: filtered }));
  }

  // --- PUT /api/order_carriers/:id ---
  if (method === 'PUT' && pathname.startsWith('/api/order_carriers/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const matchTracking = body.match(/<tracking_number>(.*?)<\/tracking_number>/);
      const tracking = matchTracking ? matchTracking[1] : '';
      let carrier = orderCarriers.find(c => c.id === id);
      if (carrier) {
        carrier.tracking_number = tracking;
      } else {
        carrier = { id, id_order: 501, tracking_number: tracking };
        orderCarriers.push(carrier);
      }
      return res.writeHead(200, { 'Content-Type': 'application/xml' })
        .end(`<?xml version="1.0" encoding="UTF-8"?><prestashop><order_carrier><id>${id}</id><tracking_number>${tracking}</tracking_number></order_carrier></prestashop>`);
    });
    return;
  }

  // --- GET /api/customers ---
  if (method === 'GET' && pathname === '/api/customers') {
    return res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ customers }));
  }

  // --- PUT /api/orders/:id ---
  if (method === 'PUT' && pathname.startsWith('/api/orders/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const ord = orders.find(o => o.id === id);
      if (ord) {
        const matchShipping = body.match(/<shipping_number>(.*?)<\/shipping_number>/);
        if (matchShipping) ord.shipping_number = matchShipping[1];
      }
      return res.writeHead(200, { 'Content-Type': 'application/xml' })
        .end(`<?xml version="1.0" encoding="UTF-8"?><prestashop><order><id>${id}</id></order></prestashop>`);
    });
    return;
  }

  // --- 404 Default ---
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `Endpoint not found: ${method} ${pathname}` }));
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`✓ Mock PrestaShop WebService API activo en http://127.0.0.1:${PORT}`);
  });
}

module.exports = { server, PORT, EXPECTED_API_KEY, products, stockAvailables, orders, customers };
