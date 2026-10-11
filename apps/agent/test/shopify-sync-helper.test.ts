import assert from 'assert';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { ShopifySyncHelper } from '../src/sync/shopify-sync.helper';
import { AccessDriver } from '@erp-bridge/connector-factusol';
import {
  ShopifyClient,
  ShopifyConnector,
  ShopifyOrderNode,
  CanonicalStockUpdate,
  SyncResult,
} from '@erp-bridge/connector-shopify';

console.log('--- Running ShopifySyncHelper Tests ---');

// Regla 13: Aislamiento Estricto de Configuración en Tests de Agente
const tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-shopify-test-'));
process.env.BENTIAN_CONFIG_PATH = path.join(tempTestDir, 'agent-config.json');

async function run() {
  try {
    // =========================================================================
    // TEST 1: Sincronización de Stock Factusol -> Shopify con Dirty Checking
    // =========================================================================
    console.log('\n▶ [Test 1] Sincronización de Stock con Dirty Checking...');
    ShopifySyncHelper.clearStockCache();
    assert.strictEqual(ShopifySyncHelper.getStockCacheSize(), 0);

    const mockStockRows = [
      { ARTSTO: 'ART-001', totalStock: 45 },
      { ARTSTO: 'ART-002', totalStock: 12 },
      { ARTSTO: 'ART-003', totalStock: 0 },
    ];

    let queryCount = 0;
    const mockDriverForStock = {
      query: async <T>(sql: string): Promise<T[]> => {
        queryCount++;
        if (sql.includes('FROM F_STO')) {
          return mockStockRows as unknown as T[];
        }
        return [] as T[];
      },
    } as unknown as AccessDriver;

    let pushedUpdates: CanonicalStockUpdate[] = [];
    const mockConnector = {
      pushStockBatch: async (updates: CanonicalStockUpdate[]): Promise<SyncResult> => {
        pushedUpdates = updates;
        return {
          success: true,
          total: updates.length,
          updated: updates.length,
          failed: 0,
        };
      },
    } as unknown as ShopifyConnector;

    const dummyConfig = {
      factusol: { warehouseCode: 'GEN', orderSeries: '1' },
      shopify: { shopSubdomain: 'test-tienda', accessToken: 'shpat_test123' },
    };

    // 1A. Primera sincronización (RAM vacía -> debe enviar todos los artículos)
    const res1 = await ShopifySyncHelper.syncStockToShopify(
      mockDriverForStock,
      dummyConfig,
      'GEN',
      { connector: mockConnector }
    );

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.itemsUpdated, 3);
    assert.strictEqual(pushedUpdates.length, 3);
    assert.strictEqual(ShopifySyncHelper.getStockCacheSize(), 3);
    assert.strictEqual(pushedUpdates[0]?.sku, 'ART-001');
    assert.strictEqual(pushedUpdates[0]?.quantity, 45);
    console.log('  ✓ Ciclo 1: 3 artículos enviados a Shopify e indexados en caché RAM.');

    // 1B. Segunda sincronización sin cambios en Factusol (dirty check -> 0 enviados)
    pushedUpdates = [];
    const res2 = await ShopifySyncHelper.syncStockToShopify(
      mockDriverForStock,
      dummyConfig,
      'GEN',
      { connector: mockConnector }
    );

    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.itemsUpdated, 0, 'No debe enviar artículos si no han variado las existencias');
    assert.strictEqual(pushedUpdates.length, 0);
    console.log('  ✓ Ciclo 2 (Dirty check): 0 artículos enviados al no haber variaciones en Factusol.');

    // 1C. Tercera sincronización con delta en ART-001 (cambia de 45 a 40)
    mockStockRows[0]!.totalStock = 40;
    pushedUpdates = [];
    const res3 = await ShopifySyncHelper.syncStockToShopify(
      mockDriverForStock,
      dummyConfig,
      'GEN',
      { connector: mockConnector }
    );

    assert.strictEqual(res3.success, true);
    assert.strictEqual(res3.itemsUpdated, 1);
    assert.strictEqual(pushedUpdates.length, 1);
    assert.strictEqual(pushedUpdates[0]?.sku, 'ART-001');
    assert.strictEqual(pushedUpdates[0]?.quantity, 40);
    console.log('  ✓ Ciclo 3 (Delta detection): Solo se envió ART-001 (40 unidades).');

    // 1D. Fallback si el almacén solicitado devuelve 0 registros
    let fallbackTriggered = false;
    const mockDriverWithFallback = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes("ALMSTO = 'ALM_VACIO'")) {
          return [] as T[];
        }
        if (sql.includes('GROUP BY ARTSTO') && !sql.includes('ALMSTO')) {
          fallbackTriggered = true;
          return [{ ARTSTO: 'ART-FALLBACK', totalStock: 99 }] as unknown as T[];
        }
        return [] as T[];
      },
    } as unknown as AccessDriver;

    ShopifySyncHelper.clearStockCache();
    pushedUpdates = [];
    const resFallback = await ShopifySyncHelper.syncStockToShopify(
      mockDriverWithFallback,
      dummyConfig,
      'ALM_VACIO',
      { connector: mockConnector }
    );

    assert.strictEqual(fallbackTriggered, true, 'Debe activar el fallback de agrupación general si el almacén específico devuelve 0');
    assert.strictEqual(resFallback.itemsUpdated, 1);
    assert.strictEqual(pushedUpdates[0]?.sku, 'ART-FALLBACK');
    console.log('  ✓ Fallback de almacén F_STO validado correctamente.');

    // =========================================================================
    // TEST 2: Importación de Pedidos Shopify (F_PCL, F_LPC, Impuestos España y Tags)
    // =========================================================================
    console.log('\n▶ [Test 2] Importación de Pedidos Shopify hacia Factusol...');

    const sampleOrders: ShopifyOrderNode[] = [
      // Pedido 1: Pagado, sin procesar, cliente con NIF, IVA estándar 21%
      {
        id: 'gid://shopify/Order/7001',
        name: '#7001',
        createdAt: '2026-10-11T11:00:00Z',
        displayFinancialStatus: 'PAID',
        displayFulfillmentStatus: undefined,
        tags: ['web', 'prioritario'],
        totalPriceSet: { shopMoney: { amount: '121.00', currencyCode: 'EUR' } },
        subtotalPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
        totalTaxSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
        totalShippingPriceSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
        totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
        taxLines: [
          {
            title: 'IVA 21%',
            ratePercentage: 21,
            priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
          },
        ],
        customer: {
          id: 'gid://shopify/Customer/9001',
          firstName: 'Carlos',
          lastName: 'García',
          displayName: 'Carlos García',
          email: 'carlos@empresa.es',
          phone: '600112233',
          metafields: {
            edges: [
              {
                node: {
                  namespace: 'custom',
                  key: 'nif',
                  value: 'B12345678',
                },
              },
            ],
          },
        },
        shippingAddress: {
          address1: 'Gran Vía 45',
          city: 'Madrid',
          province: 'Madrid',
          zip: '28013',
          countryCodeV2: 'ES',
          phone: '600112233',
        },
        billingAddress: {
          address1: 'Gran Vía 45',
          city: 'Madrid',
          province: 'Madrid',
          zip: '28013',
          countryCodeV2: 'ES',
          phone: '600112233',
        },
        lineItems: {
          edges: [
            {
              node: {
                id: 'gid://shopify/LineItem/8001',
                title: 'Taladro Percutor 800W',
                sku: 'TAL-800',
                quantity: 1,
                originalUnitPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                discountedUnitPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                originalTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                discountedTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                taxLines: [
                  {
                    title: 'IVA 21%',
                    ratePercentage: 21,
                    priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
                  },
                ],
              },
            },
          ],
        },
      },

      // Pedido 2: YA SINCRONIZADO PREVIAMENTE (tiene tag 'erp-synced' -> debe ignorarse)
      {
        id: 'gid://shopify/Order/7002',
        name: '#7002',
        createdAt: '2026-10-11T10:00:00Z',
        displayFinancialStatus: 'PAID',
        displayFulfillmentStatus: undefined,
        tags: ['erp-synced', 'factusol-pedido-500'],
        totalPriceSet: { shopMoney: { amount: '50.00', currencyCode: 'EUR' } },
      },

      // Pedido 3: NO PAGADO (financial_status: 'pending' -> debe ignorarse)
      {
        id: 'gid://shopify/Order/7003',
        name: '#7003',
        createdAt: '2026-10-11T11:15:00Z',
        displayFinancialStatus: 'PENDING',
        displayFulfillmentStatus: undefined,
        tags: [],
        totalPriceSet: { shopMoney: { amount: '75.00', currencyCode: 'EUR' } },
      },

      // Pedido 4: Pagado con Recargo de Equivalencia (R.E. 5.2%)
      {
        id: 'gid://shopify/Order/7004',
        name: '#7004',
        createdAt: '2026-10-11T11:30:00Z',
        displayFinancialStatus: 'PAID',
        displayFulfillmentStatus: undefined,
        tags: ['recargo_equivalencia'],
        totalPriceSet: { shopMoney: { amount: '126.20', currencyCode: 'EUR' } },
        subtotalPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
        totalTaxSet: { shopMoney: { amount: '26.20', currencyCode: 'EUR' } },
        totalShippingPriceSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
        totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'EUR' } },
        taxLines: [
          {
            title: 'IVA 21%',
            ratePercentage: 21,
            priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
          },
          {
            title: 'Recargo de Equivalencia',
            ratePercentage: 5.2,
            priceSet: { shopMoney: { amount: '5.20', currencyCode: 'EUR' } },
          },
        ],
        customer: {
          id: 'gid://shopify/Customer/9002',
          firstName: 'Elena',
          lastName: 'Morales',
          displayName: 'Elena Morales',
          email: 'elena@comercio.es',
          metafields: {
            edges: [
              {
                node: {
                  namespace: 'custom',
                  key: 'cif',
                  value: 'A87654321',
                },
              },
            ],
          },
        },
        shippingAddress: {
          address1: 'Calle Alcalá 120',
          city: 'Madrid',
          province: 'Madrid',
          zip: '28009',
          countryCodeV2: 'ES',
        },
        billingAddress: {
          address1: 'Calle Alcalá 120',
          city: 'Madrid',
          province: 'Madrid',
          zip: '28009',
          countryCodeV2: 'ES',
        },
        lineItems: {
          edges: [
            {
              node: {
                id: 'gid://shopify/LineItem/8002',
                title: 'Pack Tornillería Inox',
                sku: 'TOR-INOX',
                quantity: 1,
                originalUnitPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                discountedUnitPriceSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                originalTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                discountedTotalSet: { shopMoney: { amount: '100.00', currencyCode: 'EUR' } },
                taxLines: [
                  {
                    title: 'IVA 21%',
                    ratePercentage: 21,
                    priceSet: { shopMoney: { amount: '21.00', currencyCode: 'EUR' } },
                  },
                ],
              },
            },
          ],
        },
      },
    ];

    // Mock de AccessDriver que registra transacciones y correlativos
    const executedTransactions: string[][] = [];
    let nextOrderIdSequence = 600;

    const mockDriverForOrders = {
      query: async <T>(sql: string): Promise<T[]> => {
        // Comprobar idempotencia en F_PCL
        if (sql.includes('FROM F_PCL WHERE REFPCL')) {
          return [] as T[]; // No existe aún
        }
        // Buscar cliente en F_CLI por NIF
        if (sql.includes('FROM F_CLI WHERE NIFCLI')) {
          if (sql.includes('B12345678')) return [{ CODCLI: 42 }] as unknown as T[];
          if (sql.includes('A87654321')) return [{ CODCLI: 88 }] as unknown as T[];
        }
        // Obtener correlativo de pedido MAX(CODPCL)
        if (sql.includes('MAX(CODPCL)')) {
          return [{ maxid: nextOrderIdSequence }] as unknown as T[];
        }
        return [] as T[];
      },
      executeTransaction: async (sqls: string[]): Promise<void> => {
        executedTransactions.push(sqls);
        nextOrderIdSequence++;
      },
    } as unknown as AccessDriver;

    // Mock de ShopifyClient para capturar etiquetado tagsAdd
    const taggedOrders: Array<{ id: string; tags: string[] }> = [];
    const mockShopifyClient = {
      request: async <T>(query: string, vars?: Record<string, unknown>): Promise<{ data?: T }> => {
        if (query.includes('tagsAdd')) {
          const input = vars as { id: string; tags: string[] };
          taggedOrders.push(input);
          return {
            data: {
              tagsAdd: {
                node: { id: input.id },
                userErrors: [],
              },
            } as unknown as T,
          };
        }
        throw new Error(`Query no esperada en mock: ${query}`);
      },
    } as unknown as ShopifyClient;

    const recordedLedgerOrders: any[] = [];
    const mockLedgerManager = {
      recordOrder: (entry: any) => {
        recordedLedgerOrders.push(entry);
      },
    };

    const importResult = await ShopifySyncHelper.importShopifyOrders(
      mockDriverForOrders,
      dummyConfig,
      {
        client: mockShopifyClient,
        rawOrders: sampleOrders,
        series: 'W',
        warehouse: 'GEN',
        salesLedgerManager: mockLedgerManager,
      }
    );

    assert.strictEqual(importResult.success, true);
    assert.strictEqual(importResult.ordersImported, 2, 'Solo deben importarse los pedidos 1 y 4 (ignorar synced y pending)');
    assert.strictEqual(executedTransactions.length, 2, 'Debe ejecutar exactamente 2 transacciones atómicas en Factusol');

    // Verificación de la primera transacción (Pedido #7001)
    const tx1 = executedTransactions[0]!;
    const headerSql1 = tx1[0]!;
    assert.ok(headerSql1.includes("INSERT INTO F_PCL"), 'La primera sentencia debe ser la cabecera F_PCL');
    assert.ok(headerSql1.includes("'W'"), "Debe respetar la serie de pedido 'W'");
    assert.ok(headerSql1.includes("42"), 'Debe haber resuelto el cliente B12345678 con CODCLI=42');
    assert.ok(tx1.some((sql) => sql.includes("INSERT INTO F_LPC") && sql.includes("TAL-800")), 'Debe insertar línea F_LPC con TAL-800');
    assert.ok(tx1.some((sql) => sql.includes("UPDATE F_STO SET DISSTO")), 'Debe incluir decremento de stock en F_STO');

    // Verificación del pedido con Recargo de Equivalencia (Pedido #7004)
    const tx2 = executedTransactions[1]!;
    const headerSql2 = tx2[0]!;
    assert.ok(headerSql2.includes("88"), 'Debe haber resuelto el cliente A87654321 con CODCLI=88');
    assert.ok(headerSql2.includes("5.2") || headerSql2.includes("5,2"), 'Debe contener el porcentaje de R.E. 5.2%');

    // Verificación de etiquetado en Shopify
    assert.strictEqual(taggedOrders.length, 2);
    assert.strictEqual(taggedOrders[0]?.id, 'gid://shopify/Order/7001');
    assert.ok(taggedOrders[0]?.tags.includes('erp-synced'), "Debe incluir tag 'erp-synced'");
    assert.ok(taggedOrders[0]?.tags.includes('factusol-pedido-601'), "Debe incluir tag 'factusol-pedido-601'");

    assert.strictEqual(taggedOrders[1]?.id, 'gid://shopify/Order/7004');
    assert.ok(taggedOrders[1]?.tags.includes('erp-synced'));
    assert.ok(taggedOrders[1]?.tags.includes('factusol-pedido-602'));
    console.log('  ✓ 2 pedidos procesados en Factusol y etiquetados en Shopify con erp-synced y factusol-pedido-XXXX.');

    // Verificación de libro de ventas (SalesLedger)
    assert.strictEqual(recordedLedgerOrders.length, 2);
    assert.strictEqual(recordedLedgerOrders[0]?.channel, 'shopify');
    assert.strictEqual(recordedLedgerOrders[0]?.orderNumber, '7001');
    assert.strictEqual(recordedLedgerOrders[0]?.factusolOrderNumber, '601');
    assert.strictEqual(recordedLedgerOrders[1]?.orderNumber, '7004');
    assert.strictEqual(recordedLedgerOrders[1]?.factusolOrderNumber, '602');
    console.log('  ✓ Pedidos registrados en libro de ventas con canal shopify.');

    // =========================================================================
    // TEST 3: Método tagShopifyOrder Directo
    // =========================================================================
    console.log('\n▶ [Test 3] tagShopifyOrder con ID numérico y GID...');
    let lastTaggedGid = '';
    let lastTags: string[] = [];

    const mockClientForTag = {
      request: async <T>(_query: string, vars?: any): Promise<{ data?: T }> => {
        lastTaggedGid = vars.id;
        lastTags = vars.tags;
        return { data: { tagsAdd: { node: { id: vars.id }, userErrors: [] } } as unknown as T };
      },
    } as unknown as ShopifyClient;

    await ShopifySyncHelper.tagShopifyOrder(mockClientForTag, '8899', ['erp-synced', 'factusol-pedido-999']);
    assert.strictEqual(lastTaggedGid, 'gid://shopify/Order/8899');
    assert.deepStrictEqual(lastTags, ['erp-synced', 'factusol-pedido-999']);
    console.log('  ✓ tagShopifyOrder convirtió ID numérico a GID y aplicó tags correctamente.');

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS DE SHOPIFYSYNCHELPER PASARON CON ÉXITO');
    console.log('======================================================\n');
  } finally {
    // Teardown de aislamiento de configuración (Regla 13)
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('❌ Error ejecutando tests de ShopifySyncHelper:', err);
  process.exit(1);
});
