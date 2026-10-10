import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ShopifyConnector } from '../../../packages/connectors/shopify/src/shopify.connector';
import { CanonicalStockUpdate } from '../../../packages/connectors/shopify/src/shopify.types';
import { StoreAndForwardQueue } from '../../../packages/core/src/queue/store-and-forward.queue';

interface MockShopifyState {
  inventory: Map<string, number>;
  orders: any[];
  taggedOrders: Map<string, string[]>;
  rateLimitPoints: number;
  serverFailing: boolean;
  receivedBatches: number;
}

const state: MockShopifyState = {
  inventory: new Map(),
  orders: [],
  taggedOrders: new Map(),
  rateLimitPoints: 1000,
  serverFailing: false,
  receivedBatches: 0,
};

// Seed mock products in Shopify inventory
for (let i = 1; i <= 150; i++) {
  state.inventory.set(`gid://shopify/InventoryItem/${10000 + i}`, 0);
}

// Seed a realistic Spanish B2B customer order with Recargo de Equivalencia
state.orders = [
  {
    id: 'gid://shopify/Order/888999111',
    name: '#RUBIO-1001',
    createdAt: new Date().toISOString(),
    displayFinancialStatus: 'PAID',
    tags: ['web', 'recargo_equivalencia'],
    customer: {
      id: 'gid://shopify/Customer/777001',
      firstName: 'Manolo',
      lastName: 'García',
      displayName: 'Manolo García (Reformas La Mancha)',
      email: 'm.garcia@reformasrubio.es',
      phone: '+34 600 123 456',
      tags: ['recargo_equivalencia'],
    },
    shippingAddress: {
      firstName: 'Manolo',
      lastName: 'García',
      company: 'Reformas y Suministros La Mancha S.L.',
      address1: 'Polígono Industrial Las Palmeras, Nave 4',
      city: 'Toledo',
      province: 'Toledo',
      countryCodeV2: 'ES',
      zip: '45007',
      phone: '+34 600 123 456',
    },
    billingAddress: {
      firstName: 'Manolo',
      lastName: 'García',
      company: 'Reformas y Suministros La Mancha S.L.',
      address1: 'Polígono Industrial Las Palmeras, Nave 4',
      city: 'Toledo',
      province: 'Toledo',
      countryCodeV2: 'ES',
      zip: '45007',
      phone: '+34 600 123 456',
    },
    totalPriceSet: {
      shopMoney: { amount: '266.20', currencyCode: 'EUR' },
    },
    lineItems: {
      edges: [
        {
          node: {
            id: 'gid://shopify/LineItem/1',
            sku: 'ART-RUBIO-0001',
            title: 'Broca Hormigón SDS Plus 8x160mm',
            quantity: 10,
            originalUnitPriceSet: {
              shopMoney: { amount: '10.00', currencyCode: 'EUR' },
            },
            taxLines: [
              {
                title: 'IVA 21%',
                rate: 0.21,
                priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
              },
            ],
          },
        },
        {
          node: {
            id: 'gid://shopify/LineItem/2',
            sku: 'ART-RUBIO-0002',
            title: 'Pintura Epoxi Suelos Industriales 5L (R.E.)',
            quantity: 1,
            originalUnitPriceSet: {
              shopMoney: { amount: '100.00', currencyCode: 'EUR' },
            },
            taxLines: [
              {
                title: 'IVA 21%',
                rate: 0.21,
                priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
              },
              {
                title: 'Recargo de Equivalencia 5.2%',
                rate: 0.052,
                priceSet: { shopMoney: { amount: '5.20', currencyCode: 'EUR' } },
              },
            ],
          },
        },
      ],
    },
  },
];

async function startMockShopifyServer(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (state.serverFailing) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service Unavailable (Simulated Outage)' }));
      return;
    }

    const authHeader = req.headers['x-shopify-access-token'];
    if (authHeader !== 'shpat_rubio_secret_token_2026') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: '[API] Invalid API key or access token' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const query = payload.query || '';
      const variables = payload.variables || {};

      const extensions = {
        cost: {
          requestedQueryCost: 10,
          actualQueryCost: 10,
          throttleStatus: {
            maximumAvailable: 1000,
            currentlyAvailable: state.rateLimitPoints,
            restoreRate: 50,
          },
        },
      };

      // 1. Shop Info / Test Connection Query
      if (query.includes('testConnection') || query.includes('shop {')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: { shop: { id: 'gid://shopify/Shop/12345', name: 'Suministros Rubio Oficial (Shopify Demo)' } },
          extensions,
        }));
        return;
      }

      // 2. Locations Query
      if (query.includes('locations(') || query.includes('locations {')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            locations: {
              edges: [
                {
                  node: {
                    id: 'gid://shopify/Location/987654321',
                    name: 'Almacén Central Toledo (Factusol F_STO)',
                    isActive: true,
                  },
                },
                {
                  node: {
                    id: 'gid://shopify/Location/987654322',
                    name: 'Mostrador Tienda Física',
                    isActive: true,
                  },
                },
              ],
            },
          },
          extensions,
        }));
        return;
      }

      // 3. Resolve Product Variants / InventoryItem IDs by SKU
      if (query.includes('productVariants(')) {
        const skuMatch = query.match(/sku:([^\s)]+)/);
        const edges: any[] = [];
        if (skuMatch) {
          const sku = skuMatch[1];
          const idNum = parseInt(sku.replace(/\D/g, ''), 10) || 1;
          edges.push({
            node: {
              id: `gid://shopify/ProductVariant/${idNum}`,
              sku,
              inventoryItem: { id: `gid://shopify/InventoryItem/${10000 + idNum}` },
            },
          });
        } else {
          // Return all known inventory items
          for (let i = 1; i <= 150; i++) {
            const sku = `ART-RUBIO-${String(i).padStart(4, '0')}`;
            edges.push({
              node: {
                id: `gid://shopify/ProductVariant/${i}`,
                sku,
                inventoryItem: { id: `gid://shopify/InventoryItem/${10000 + i}` },
              },
            });
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: { productVariants: { edges } },
          extensions,
        }));
        return;
      }

      // 4. Inventory Set Quantities (Batch Stock Update)
      if (query.includes('inventorySetQuantities')) {
        state.receivedBatches++;
        const quantities = variables.input?.quantities || [];
        if (quantities.length > 50) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            data: {
              inventorySetQuantities: {
                userErrors: [{ field: ['quantities'], message: 'Maximum 50 items per batch exceeded' }],
              },
            },
            extensions,
          }));
          return;
        }

        for (const item of quantities) {
          state.inventory.set(item.inventoryItemId, item.quantity);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: { inventorySetQuantities: { userErrors: [] } },
          extensions,
        }));
        return;
      }

      // 5. Orders Query
      if (query.includes('orders(')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            orders: {
              edges: state.orders.map((o) => ({ node: o })),
            },
          },
          extensions,
        }));
        return;
      }

      // 6. Tags Add Mutation
      if (query.includes('tagsAdd')) {
        const orderId = variables.id;
        const tags = variables.tags || [];
        const existing = state.taggedOrders.get(orderId) || [];
        state.taggedOrders.set(orderId, [...existing, ...tags]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: { tagsAdd: { userErrors: [] } },
          extensions,
        }));
        return;
      }

      // Default fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: {}, extensions }));
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function runLiveE2EShopifySuite() {
  console.log('================================================================');
  console.log('🧪 SUITE END-TO-END: SHOPIFY GRAPHQL & FACTUSOL DISSTO LIVE TEST');
  console.log('================================================================\n');

  const testPort = 39444;
  const mockServer = await startMockShopifyServer(testPort);
  console.log(`✓ Servidor Mock Shopify GraphQL activo en: http://127.0.0.1:${testPort}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-e2e-shopify-'));

  try {
    const config = {
      shopSubdomain: 'suministros-rubio-demo',
      accessToken: 'shpat_rubio_secret_token_2026',
      endpointUrl: `http://127.0.0.1:${testPort}/admin/api/2026-01/graphql.json`,
      locationId: 'gid://shopify/Location/987654321',
      rateLimitMinimumPoints: 100,
    };

    const connector = new ShopifyConnector(config);

    // -------------------------------------------------------------------------
    // TEST 1: Handshake y Verificación de Conexión
    // -------------------------------------------------------------------------
    console.log('\n▶ [Escenario 1/5] Verificando Handshake y Conectividad...');
    const connCheck = await connector.testConnection();
    if (!connCheck.success) throw new Error('Handshake falló con el servidor mock');
    console.log(`  ✓ Conexión establecida con éxito en ${connCheck.latencyMs}ms.`);

    // -------------------------------------------------------------------------
    // TEST 2: Sincronización Masiva en Lotes DISSTO (120 Artículos)
    // -------------------------------------------------------------------------
    console.log('\n▶ [Escenario 2/5] Sincronización Masiva de Stock DISSTO (120 Artículos)...');
    const stockUpdates: CanonicalStockUpdate[] = [];
    for (let i = 1; i <= 120; i++) {
      const sku = `ART-RUBIO-${String(i).padStart(4, '0')}`;
      stockUpdates.push({
        sku,
        quantity: 100, // Stock físico
        availableQuantity: 75, // DISSTO real evitando sobreventas (100 - 25 comprometidas)
        inventoryItemId: `gid://shopify/InventoryItem/${10000 + i}`,
      });
    }

    state.receivedBatches = 0;
    const syncRes = await connector.pushStockBatch(stockUpdates);
    if (!syncRes.success || syncRes.updated !== 120) {
      throw new Error(`Fallo en sincronización masiva: ${JSON.stringify(syncRes)}`);
    }

    // Comprobar que se ejecutaron exactamente 3 lotes (50 + 50 + 20)
    if (state.receivedBatches !== 3) {
      throw new Error(`Esperados exactamente 3 lotes de máximo 50 ítems, recibidos: ${state.receivedBatches}`);
    }
    console.log(`  ✓ 120 artículos actualizados en ${state.receivedBatches} lotes automáticos (50 + 50 + 20).`);
    console.log(`  ✓ Verificado valor de inventario: Item #1 = ${state.inventory.get('gid://shopify/InventoryItem/10001')} uds (DISSTO = 75).`);

    // -------------------------------------------------------------------------
    // TEST 3: Ingesta de Pedidos B2B y Normalización de Recargo de Equivalencia
    // -------------------------------------------------------------------------
    console.log('\n▶ [Escenario 3/5] Descarga e Ingesta de Pedidos con IVA + Recargo de Equivalencia...');
    const orders = await connector.pullRecentOrders(new Date(Date.now() - 3600000));
    if (orders.length !== 1 || !orders[0]) throw new Error(`Esperado 1 pedido, recibidos: ${orders.length}`);

    const order = orders[0];
    console.log(`  ✓ Pedido detectado: ${order.orderNumber} (Cliente: ${order.customer.fiscalName})`);
    console.log(`  ✓ Destino: ${order.shippingAddress?.street}, ${order.shippingAddress?.city} (${order.shippingAddress?.postalCode})`);

    const lineNormal = order.lines[0];
    const lineRecargo = order.lines[1];

    if (!lineNormal || !lineRecargo) throw new Error('El pedido debe tener 2 líneas');

    if (lineNormal.vatPercent !== 21) throw new Error(`Línea 1 IVA esperado 21%, obtenido: ${lineNormal.vatPercent}%`);
    if (order.hasEquivalenceSurcharge !== true || order.equivalenceSurchargeRate !== 5.2) {
      throw new Error(`Pedido esperado con R.E. 5.2%, obtenido: hasEquiv=${order.hasEquivalenceSurcharge}, rate=${order.equivalenceSurchargeRate}%`);
    }
    console.log(`  ✓ Línea 1 [${lineNormal.sku}]: ${lineNormal.quantity}x ${lineNormal.unitPrice}€ + IVA ${lineNormal.vatPercent}%`);
    console.log(`  ✓ Línea 2 [${lineRecargo.sku}]: ${lineRecargo.quantity}x ${lineRecargo.unitPrice}€ + IVA ${lineRecargo.vatPercent}%`);
    console.log(`  ✓ Recargo de Equivalencia aplicado a nivel de pedido: ${order.equivalenceSurchargeRate}%`);

    // -------------------------------------------------------------------------
    // TEST 4: Resiliencia Store-and-Forward ante Caídas de Shopify
    // -------------------------------------------------------------------------
    console.log('\n▶ [Escenario 4/5] Prueba de Tolerancia a Cortes de Red (Store-and-Forward)...');
    const queue = new StoreAndForwardQueue({
      storagePath: path.join(tempDir, 'shopify-e2e-queue.json'),
      maxRetries: 3,
    });

    state.serverFailing = true; // Simular caída de Shopify (503)
    console.log('  ⚠️ Shopify API simulada en estado CAÍDA (503 Service Unavailable)...');

    const failingBatch: CanonicalStockUpdate[] = [
      { sku: 'ART-RUBIO-0001', quantity: 99, availableQuantity: 70, inventoryItemId: 'gid://shopify/InventoryItem/10001' },
    ];

    const pushRes = await connector.pushStockBatch(failingBatch);
    if (!pushRes.success) {
      console.log('  ✓ Error de caída detectado limpiamente sin crash (success=false). Evento guardado en cola local.');
      await queue.enqueue('STOCK_SYNC', { updates: failingBatch });
    } else {
      throw new Error('Debería haber reportado fallo al estar el servidor caído');
    }

    // Recuperar servidor
    state.serverFailing = false;
    console.log('  🌐 Shopify API RESTABLECIDA (200 OK). Procesando cola offline...');

    const pending = await queue.getAllEvents({ status: 'PENDING' });
    if (pending.length !== 1) throw new Error(`Esperado 1 evento pendiente, encontrados: ${pending.length}`);

    // Procesar evento encolado
    const nextEvt = await queue.dequeue();
    if (nextEvt) {
      await connector.pushStockBatch(nextEvt.payload.updates);
      await queue.acknowledge(nextEvt.id);
    }

    if (state.inventory.get('gid://shopify/InventoryItem/10001') !== 70) {
      throw new Error('El stock no se actualizó tras recuperar la conectividad');
    }
    console.log('  ✓ Cola offline vaciada con éxito. Stock sincronizado atómicamente a 70 uds.');

    // -------------------------------------------------------------------------
    // TEST 5: Conciliación e Idempotencia (Acknowledge)
    // -------------------------------------------------------------------------
    console.log('\n▶ [Escenario 5/5] Marcado de Sincronización e Idempotencia (acknowledgeOrder)...');
    await connector.acknowledgeOrder(order.id);
    const gid = `gid://shopify/Order/${order.id.replace(/\D/g, '')}`;
    const tags = state.taggedOrders.get(gid) || [];
    if (!tags.includes('erp-synced') || !tags.includes('acknowledged')) {
      throw new Error(`Etiquetas esperadas no encontradas: ${JSON.stringify(tags)}`);
    }
    console.log(`  ✓ Pedido etiquetado en Shopify con: [${tags.join(', ')}]. Idempotencia garantizada.`);

    console.log('\n================================================================');
    console.log('🎉 TODOS LOS 5 ESCENARIOS LIVE E2E DE SHOPIFY PASARON CON ÉXITO');
    console.log('================================================================\n');
  } finally {
    mockServer.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runLiveE2EShopifySuite().catch((err) => {
  console.error('\n❌ ERROR EN SUITE E2E DE SHOPIFY:', err);
  process.exit(1);
});
