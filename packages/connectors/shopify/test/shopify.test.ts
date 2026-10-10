import assert from 'assert';
import {
  ShopifyClient,
  ShopifyConnector,
  ShopifyOrderMapper,
  ShopifyRateLimiter,
  ShopifyOrderNode,
  CanonicalStockUpdate,
  ShopifyGraphQLResponse,
} from '../src';

console.log('--- Iniciando Suite de Pruebas: Shopify Connector ---');

async function runTests() {
  // =========================================================================
  // 1. Rate Limiter (Token Bucket Scheduler)
  // =========================================================================
  console.log('\n▶ Test 1: Rate Limiter y Token Bucket Scheduler...');
  const rateLimiter = new ShopifyRateLimiter(100);

  // Inicialmente tiene 2000 puntos
  assert.strictEqual(rateLimiter.getStatus().maximumAvailable, 2000);
  assert.strictEqual(rateLimiter.getStatus().currentlyAvailable, 2000);

  // Actualizar estado simulando cuota baja (< 100)
  rateLimiter.updateThrottleStatus({
    maximumAvailable: 2000,
    currentlyAvailable: 40,
    restoreRate: 100, // 100 puntos por segundo = 1 punto cada 10ms
  });

  // Debe esperar para alcanzar 100 puntos (déficit de 60 puntos a 100 pts/seg = ~600ms)
  const waitMs = await rateLimiter.acquire(10);
  assert.ok(waitMs >= 500 && waitMs <= 700, `Debe pausar el tiempo necesario (esperó ${waitMs}ms)`);
  assert.ok(rateLimiter.getEstimatedAvailablePoints() >= 90, 'Los puntos deben haberse restaurado');
  console.log('  ✓ Token bucket pausa correctamente cuando currentlyAvailable < 100');

  // =========================================================================
  // 2. Client & Connection Test (Mocked)
  // =========================================================================
  console.log('\n▶ Test 2: Conexión y Latencia (testConnection)...');
  const mockConfig = {
    shopSubdomain: 'test-shop.myshopify.com',
    accessToken: 'shpat_test_token_1234567890abcdef',
    apiVersion: '2026-01',
    locationId: 'gid://shopify/Location/987654',
  };

  const client = new ShopifyClient(mockConfig);
  assert.strictEqual(
    client.getEndpointUrl(),
    'https://test-shop.myshopify.com/admin/api/2026-01/graphql.json'
  );

  // Mock de client.request para simular respuesta exitosa
  client.request = async <T>(query: string): Promise<ShopifyGraphQLResponse<T>> => {
    if (query.includes('testConnection')) {
      return {
        data: {
          shop: {
            id: 'gid://shopify/Shop/12345',
            name: 'Tienda Oficial de Prueba',
            myshopifyDomain: 'test-shop.myshopify.com',
          },
        } as unknown as T,
      };
    }
    throw new Error('Query no contemplada en mock');
  };

  const connector = new ShopifyConnector(mockConfig, client);
  assert.strictEqual(connector.id, 'chan_shopify');
  assert.strictEqual(connector.name, 'Shopify Store Channel');
  assert.strictEqual(connector.type, 'DESTINATION');

  const connResult = await connector.testConnection();
  assert.strictEqual(connResult.success, true);
  assert.ok(connResult.latencyMs >= 0);
  console.log(`  ✓ Conexión exitosa verificada (latencia: ${connResult.latencyMs}ms)`);

  // =========================================================================
  // 3. Stock Batching (DISSTO / availableQuantity)
  // =========================================================================
  console.log('\n▶ Test 3: Sincronización de Stock en Lotes DISSTO (pushStockBatch)...');
  const updates: CanonicalStockUpdate[] = [];

  // Crear 105 actualizaciones para probar división en lotes de 50 (50 + 50 + 5)
  for (let i = 1; i <= 105; i++) {
    updates.push({
      sku: `SKU-${i.toString().padStart(4, '0')}`,
      quantity: 100 + i,
      availableQuantity: 90 + i, // DISSTO disponible
      inventoryItemId: `gid://shopify/InventoryItem/1000${i}`,
    });
  }

  let mutationCallsCount = 0;
  const processedBatchesSizes: number[] = [];

  client.request = async <T>(query: string, vars?: Record<string, unknown>): Promise<ShopifyGraphQLResponse<T>> => {
    if (query.includes('inventorySetQuantities')) {
      mutationCallsCount++;
      const input = vars?.input as { quantities: Array<{ quantity: number }> };
      processedBatchesSizes.push(input.quantities.length);

      // Verificar que use availableQuantity (DISSTO) en el primer lote
      if (mutationCallsCount === 1) {
        assert.strictEqual(input.quantities[0]?.quantity, 91); // 90 + 1 = 91
      }

      return {
        data: {
          inventorySetQuantities: {
            inventoryAdjustmentGroup: { id: 'gid://shopify/InventoryAdjustmentGroup/1' },
            userErrors: [],
          },
        } as unknown as T,
      };
    }
    throw new Error('Query inesperada');
  };

  const stockResult = await connector.pushStockBatch(updates);
  assert.strictEqual(stockResult.success, true);
  assert.strictEqual(stockResult.total, 105);
  assert.strictEqual(stockResult.updated, 105);
  assert.strictEqual(stockResult.failed, 0);
  assert.strictEqual(mutationCallsCount, 3, 'Debe llamar 3 veces a la API (50, 50, 5)');
  assert.deepStrictEqual(processedBatchesSizes, [50, 50, 5], 'Los lotes deben agruparse en máximo 50 unidades');
  console.log('  ✓ Lotes de 50 con availableQuantity (DISSTO) ejecutados correctamente');

  // =========================================================================
  // 4. Mapeo de Pedidos y Detección de Recargo de Equivalencia con CanonicalTax
  // =========================================================================
  console.log('\n▶ Test 4: Pedidos y Recargo de Equivalencia (ShopifyOrderMapper)...');

  const rawOrderWithRE: ShopifyOrderNode = {
    id: 'gid://shopify/Order/8888',
    name: '#1088',
    createdAt: '2026-10-10T12:00:00Z',
    displayFinancialStatus: 'PAID',
    displayFulfillmentStatus: 'UNFULFILLED',
    totalPriceSet: { shopMoney: { amount: '126.20', currencyCode: 'EUR' } },
    subtotalPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
    totalTaxSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
    totalShippingPriceSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
    totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
    taxLines: [
      {
        title: 'IVA 21%',
        rate: 0.21,
        ratePercentage: 21,
        priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
      },
    ],
    customer: {
      id: 'gid://shopify/Customer/99001',
      firstName: 'Almacenes',
      lastName: 'Gómez',
      displayName: 'Almacenes Gómez S.L.',
      email: 'compras@almacenesgomez.es',
      phone: '+34600112233',
      tags: ['mayorista', 'recargo_equivalencia'], // Tag de Recargo de Equivalencia
      metafields: {
        edges: [
          { node: { namespace: 'custom', key: 'nif', value: 'B12345678' } },
        ],
      },
    },
    billingAddress: {
      firstName: 'Almacenes',
      lastName: 'Gómez',
      company: 'Almacenes Gómez S.L.',
      address1: 'Polígono Industrial Nave 4',
      city: 'Valencia',
      province: 'Valencia',
      zip: '46001',
      countryCodeV2: 'ES',
      phone: '+34600112233',
    },
    lineItems: {
      edges: [
        {
          node: {
            id: 'gid://shopify/LineItem/7701',
            title: 'Broca Hormigón 10mm',
            sku: 'BRO-HORM-10',
            quantity: 10,
            originalUnitPriceSet: { shopMoney: { amount: '10.00', currencyCode: 'EUR' } },
            discountedUnitPriceSet: { shopMoney: { amount: '10.00', currencyCode: 'EUR' } },
            originalTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
            discountedTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
            taxLines: [
              {
                title: 'IVA 21%',
                rate: 0.21,
                ratePercentage: 21,
                priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
              },
            ],
          },
        },
      ],
    },
  };

  const canonicalOrder = ShopifyOrderMapper.toCanonicalOrder(rawOrderWithRE);

  assert.strictEqual(canonicalOrder.id, 'shopify_order_8888');
  assert.strictEqual(canonicalOrder.orderNumber, '1088');
  assert.strictEqual(canonicalOrder.status, 'processing');
  assert.strictEqual(canonicalOrder.hasEquivalenceSurcharge, true, 'Debe detectar R.E. desde tags');
  assert.strictEqual(canonicalOrder.equivalenceSurchargeRate, 5.2, 'El tipo de R.E. para 21% IVA debe ser 5.2%');
  assert.strictEqual(canonicalOrder.customer.hasEquivalenceSurcharge, true);
  assert.strictEqual(canonicalOrder.customer.taxId, 'B12345678');
  assert.strictEqual(canonicalOrder.lines.length, 1);
  assert.strictEqual(canonicalOrder.lines[0]?.sku, 'BRO-HORM-10');

  // Comprobar inyección de CanonicalTax
  const taxes = (canonicalOrder as any).taxes;
  assert.ok(Array.isArray(taxes), 'Debe incluir lista de taxes');
  assert.strictEqual(taxes.length, 2, 'Debe contener IVA y Recargo de Equivalencia');

  const reTax = taxes.find((t: any) => t.isEquivalenceSurcharge);
  assert.ok(reTax, 'Debe haber un impuesto de Recargo de Equivalencia inyectado');
  assert.strictEqual(reTax.rate, 5.2);
  assert.strictEqual(reTax.amount, 5.2); // 100 * 5.2% = 5.20
  console.log('  ✓ Recargo de Equivalencia (5.2%) y CanonicalTax inyectados correctamente');

  // =========================================================================
  // 5. pullRecentOrders (Filtrado de solo pagados)
  // =========================================================================
  console.log('\n▶ Test 5: pullRecentOrders y filtrado de pedidos pagados...');
  const rawPendingOrder: ShopifyOrderNode = {
    ...rawOrderWithRE,
    id: 'gid://shopify/Order/8889',
    displayFinancialStatus: 'PENDING',
  };

  client.request = async <T>(query: string): Promise<ShopifyGraphQLResponse<T>> => {
    if (query.includes('getPaidOrders')) {
      return {
        data: {
          orders: {
            pageInfo: { hasNextPage: false, endCursor: null },
            edges: [
              { node: rawOrderWithRE },   // PAID
              { node: rawPendingOrder }, // PENDING -> debe ser ignorado
            ],
          },
        } as unknown as T,
      };
    }
    throw new Error('Query inesperada');
  };

  const pulledOrders = await connector.pullRecentOrders(new Date('2026-10-01'));
  assert.strictEqual(pulledOrders.length, 1, 'Solo debe procesar pedidos pagados');
  assert.strictEqual(pulledOrders[0]?.orderNumber, '1088');
  console.log('  ✓ Pedidos pagados filtrados y normalizados con éxito');

  // =========================================================================
  // 6. acknowledgeOrder
  // =========================================================================
  console.log('\n▶ Test 6: acknowledgeOrder (etiquetado de sincronización)...');
  let acknowledgedId = '';
  let addedTags: string[] = [];

  client.request = async <T>(query: string, vars?: Record<string, unknown>): Promise<ShopifyGraphQLResponse<T>> => {
    if (query.includes('tagsAdd')) {
      acknowledgedId = vars?.id as string;
      addedTags = vars?.tags as string[];
      return {
        data: {
          tagsAdd: {
            node: { id: acknowledgedId },
            userErrors: [],
          },
        } as unknown as T,
      };
    }
    throw new Error('Query inesperada');
  };

  await connector.acknowledgeOrder('8888');
  assert.strictEqual(acknowledgedId, 'gid://shopify/Order/8888');
  assert.deepStrictEqual(addedTags, ['erp-synced', 'acknowledged']);
  console.log('  ✓ acknowledgeOrder envía etiquetas de sincronización');

  console.log('\n======================================================');
  console.log('🎉 TODOS LOS TESTS DE SHOPIFY PASARON SATISFACTORIAMENTE');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en test suite de Shopify:', err);
  process.exit(1);
});
