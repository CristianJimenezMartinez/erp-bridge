import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  CanonicalOrder,
  CanonicalStock,
  CanonicalStockUpdate,
} from '@erp-bridge/shared';
import { OrderMutationResult } from '@erp-bridge/sdk';
import { StoreAndForwardQueue } from '@erp-bridge/core';
import { HoldedSalesOrder } from '@erp-bridge/connector-holded';
import {
  TripartitePipelineService,
  IFactusolAdapter,
  IShopifyChannel,
  IHoldedChannel,
} from '../src/sync/tripartite-pipeline.service';

/**
 * Suite de pruebas unitarias y de integración para TripartitePipelineService:
 * 1. Ingesta de pedido Shopify -> Reserva Factusol -> Creación de orden de venta en Holded con IVA 21% y Recargo 5.2% -> Acknowledge en Shopify.
 * 2. Resiliencia ante caída de Holded (503): Factusol procesa el pedido y Holded se encola en Store-and-Forward para reintento automático.
 * 3. Propagación simultánea de stock disponible Factusol DISSTO a Shopify y Holded.
 * 4. Blindaje Anti-Overselling: Rechazo inmediato de pedidos cuando availableQuantity < requestedQuantity.
 */
async function runTests() {
  console.log('======================================================================');
  console.log('🚀 TEST SUITE: TripartitePipelineService (Shopify -> Factusol -> Holded)');
  console.log('======================================================================\n');

  const tempDir = path.join(os.tmpdir(), `bentian-tripartite-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const originalConfigPath = process.env.BENTIAN_CONFIG_PATH;
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  try {
    const queueStoragePath = path.join(tempDir, 'queue', 'events-queue.json');

    // ------------------------------------------------------------------------
    // TEST 1: Flujo feliz completo (Shopify -> Factusol -> Holded R.E. 5.2% -> Shopify Ack)
    // ------------------------------------------------------------------------
    console.log('▶ TEST 1: Ingesta de pedido Shopify -> Reserva Factusol -> Holded (IVA 21% + R.E. 5.2%) -> Ack Shopify');
    {
      const queue = new StoreAndForwardQueue({ storagePath: queueStoragePath });

      // Mock Factusol
      const factusolStockDB: Map<string, { quantity: number; availableQuantity: number }> = new Map([
        ['ART-BOMBA-01', { quantity: 20, availableQuantity: 15 }],
      ]);
      const factusolCreatedOrders: CanonicalOrder[] = [];

      const mockFactusol: IFactusolAdapter = {
        async readStock(options) {
          const results: CanonicalStock[] = [];
          for (const sku of options?.skus || []) {
            const data = factusolStockDB.get(sku);
            if (data) {
              results.push({
                sku,
                quantity: data.quantity,
                availableQuantity: data.availableQuantity, // DISSTO
                warehouse: options?.warehouse || 'GEN',
                lastUpdated: new Date(),
              });
            }
          }
          return results;
        },
        async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
          factusolCreatedOrders.push(order);
          // Decrementa stock disponible
          for (const line of order.lines) {
            const current = factusolStockDB.get(line.sku);
            if (current) {
              current.availableQuantity -= line.quantity;
            }
          }
          return {
            success: true,
            orderId: order.id,
            externalId: '10045',
            orderNumber: '10045',
            status: 'pending',
          };
        },
      };

      // Mock Holded
      let holdedCreatedOrder: HoldedSalesOrder | null = null;
      const mockHolded: IHoldedChannel = {
        async createSalesOrder(order: HoldedSalesOrder) {
          holdedCreatedOrder = order;
          return {
            status: 1,
            id: 'hld_so_889900',
            info: 'Sales order created',
          };
        },
      };

      // Mock Shopify
      const shopifyAcknowledged: string[] = [];
      const mockShopify: IShopifyChannel = {
        async acknowledgeOrder(remoteOrderId: string) {
          shopifyAcknowledged.push(remoteOrderId);
        },
      };

      const pipeline = new TripartitePipelineService({
        shopify: mockShopify,
        factusol: mockFactusol,
        holded: mockHolded,
        options: { queue, defaultWarehouse: 'GEN' },
      });

      // Pedido minorista español con Recargo de Equivalencia (IVA 21% + R.E. 5.2%)
      const shopifyOrder: CanonicalOrder = {
        id: 'gid://shopify/Order/7711223344',
        orderNumber: '#1001',
        series: 'W',
        reference: 'SHOP-1001',
        date: new Date('2026-10-10T12:00:00Z'),
        status: 'processing',
        currency: 'EUR',
        customer: {
          id: 'cust_shop_123',
          fiscalName: 'Ferretería y Suministros Gómez SL',
          commercialName: 'Suministros Gómez',
          taxId: 'B99887766',
          hasEquivalenceSurcharge: true, // Recargo de Equivalencia activo
        },
        hasEquivalenceSurcharge: true,
        lines: [
          {
            id: 'line_101',
            position: 1,
            sku: 'ART-BOMBA-01',
            name: 'Bomba Sumergible 1CV Inox',
            quantity: 2,
            unitPrice: 150.0,
            discountPercent: 0,
            vatPercent: 21.0,
            vatType: 0,
            subtotal: 300.0,
            total: 300.0,
          },
        ],
        netAmount: 300.0,
        taxAmount: 78.6, // 63.0 (IVA 21%) + 15.6 (RE 5.2%)
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount: 378.6,
        warehouse: 'GEN',
      };

      const result = await pipeline.processShopifyOrder(shopifyOrder, {
        createHoldedDocument: true,
        autoAcknowledge: true,
      });

      // Verificaciones Test 1
      assert.strictEqual(result.success, true, 'El proceso tripartito debe tener éxito');
      assert.strictEqual(result.stockCheck.passed, true, 'Comprobación de stock Factusol debe pasar');
      assert.strictEqual(result.factusolResult?.success, true, 'Factusol createOrder debe ser exitoso');
      assert.strictEqual(result.factusolResult?.orderNumber, '10045', 'Número de pedido Factusol correlativo');
      assert.strictEqual(result.holdedResult?.success, true, 'Holded createSalesOrder debe ser exitoso');
      assert.strictEqual(result.holdedResult?.documentId, 'hld_so_889900', 'ID de orden de venta de Holded devuelto');
      assert.strictEqual(result.shopifyAcknowledged, true, 'Shopify acknowledgeOrder debe completarse');
      assert.strictEqual(shopifyAcknowledged.length, 1);
      assert.strictEqual(shopifyAcknowledged[0], 'gid://shopify/Order/7711223344');

      // Verificación estricta de Modelo Fiscal Español en Holded
      assert(holdedCreatedOrder !== null, 'Holded debe haber recibido la orden');
      const holdedOrder = holdedCreatedOrder as unknown as HoldedSalesOrder;
      assert.strictEqual(holdedOrder.items.length, 1);
      const item = holdedOrder.items[0]!;
      assert.strictEqual(item.sku, 'ART-BOMBA-01');
      assert.strictEqual(item.units, 2);
      assert.strictEqual(item.subtotal, 150.0);
      assert.strictEqual(item.tax, 21.0, 'El tipo de IVA debe ser 21.0%');
      assert.strictEqual(item.re, 5.2, 'El Recargo de Equivalencia debe ser 5.2% para IVA general');

      console.log('  ✓ Test 1 superado: Pipeline Shopify -> Factusol -> Holded (IVA 21% + R.E. 5.2%) -> Ack completado con éxito.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 2: Resiliencia ante caída de Holded (503 Service Unavailable)
    // ------------------------------------------------------------------------
    console.log('▶ TEST 2: Resiliencia ante caída de Holded (503): Factusol protegido y encolado en Store-and-Forward');
    {
      const queue = new StoreAndForwardQueue({ storagePath: queueStoragePath });

      // Mock Factusol
      const factusolStockDB: Map<string, { quantity: number; availableQuantity: number }> = new Map([
        ['ART-TUBERIA-02', { quantity: 100, availableQuantity: 50 }],
      ]);
      let factusolOrderCreated = false;

      const mockFactusol: IFactusolAdapter = {
        async readStock(options) {
          const results: CanonicalStock[] = [];
          for (const sku of options?.skus || []) {
            const data = factusolStockDB.get(sku);
            if (data) {
              results.push({
                sku,
                quantity: data.quantity,
                availableQuantity: data.availableQuantity,
                warehouse: 'GEN',
                lastUpdated: new Date(),
              });
            }
          }
          return results;
        },
        async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
          factusolOrderCreated = true;
          return {
            success: true,
            orderId: order.id,
            externalId: '10046',
            orderNumber: '10046',
            status: 'pending',
          };
        },
      };

      // Mock Holded simulando caída del servicio central (503 Service Unavailable)
      let holdedServiceOnline = false;

      const mockHolded: IHoldedChannel = {
        async createSalesOrder(_order: HoldedSalesOrder) {
          if (!holdedServiceOnline) {
            throw new Error('Holded API HTTP 503 Service Unavailable: Scheduled maintenance window');
          }
          return {
            status: 1,
            id: 'hld_so_recovered_9901',
            info: 'Created after recovery',
          };
        },
      };

      const mockShopify: IShopifyChannel = {
        async acknowledgeOrder(_id: string) {},
      };

      const pipeline = new TripartitePipelineService({
        shopify: mockShopify,
        factusol: mockFactusol,
        holded: mockHolded,
        options: { queue, defaultWarehouse: 'GEN' },
      });

      const order503: CanonicalOrder = {
        id: 'gid://shopify/Order/8833445566',
        orderNumber: '#1002',
        series: 'W',
        reference: 'SHOP-1002',
        date: new Date('2026-10-10T12:05:00Z'),
        status: 'processing',
        currency: 'EUR',
        customer: {
          id: 'cust_shop_456',
          fiscalName: 'Instalaciones Fontanería Ruiz SA',
          taxId: 'A11223344',
          hasEquivalenceSurcharge: false,
        },
        hasEquivalenceSurcharge: false,
        lines: [
          {
            id: 'line_201',
            position: 1,
            sku: 'ART-TUBERIA-02',
            name: 'Tubería Cobre 15mm x 2.5m',
            quantity: 5,
            unitPrice: 20.0,
            discountPercent: 0,
            vatPercent: 21.0,
            vatType: 0,
            subtotal: 100.0,
            total: 100.0,
          },
        ],
        netAmount: 100.0,
        taxAmount: 21.0,
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount: 121.0,
        warehouse: 'GEN',
      };

      const result = await pipeline.processShopifyOrder(order503, {
        createHoldedDocument: true,
        autoAcknowledge: true,
      });

      // Verificaciones Test 2: Factusol intacto, Holded encolado
      assert.strictEqual(result.success, true, 'El flujo no debe quebrarse si Factusol reservó con éxito');
      assert.strictEqual(factusolOrderCreated, true, 'Factusol DEBE haber reservado el pedido');
      assert.strictEqual(result.factusolResult?.success, true);
      assert.strictEqual(result.factusolResult?.orderNumber, '10046');

      // Holded encolado en Store-and-Forward
      assert.strictEqual(result.holdedResult?.success, false, 'Holded falló por 503');
      assert.strictEqual(result.holdedResult?.queued, true, 'El evento DEBE quedar marcado como encolado');
      assert(result.holdedResult?.queueEventId, 'Debe devolver el ID de evento de la cola');
      assert(result.holdedResult?.error?.includes('503 Service Unavailable'));

      // Verificar persistencia atómica en disco del evento
      const queueEventId = result.holdedResult!.queueEventId!;
      const storedEvent = await queue.getEvent(queueEventId);
      assert(storedEvent !== null, 'El evento debe existir en disco');
      assert.strictEqual(storedEvent?.type, 'HOLDED_ORDER_PUSH');
      assert.strictEqual(storedEvent?.status, 'PENDING');
      assert.strictEqual(storedEvent?.payload.orderNumber, '#1002');
      assert.strictEqual(storedEvent?.payload.holdedOrder.items[0].sku, 'ART-TUBERIA-02');

      // Verificar recuperación ("Forward"): Holded vuelve online
      console.log('  → Simulando restablecimiento de Holded y reenvío desde cola Store-and-Forward...');
      holdedServiceOnline = true;

      const forwardSuccess = await queue.forwardNext(async (evt) => {
        if (evt.type === 'HOLDED_ORDER_PUSH') {
          const resp = await mockHolded.createSalesOrder!(evt.payload.holdedOrder);
          return Boolean(resp.id);
        }
        return true;
      });

      assert.strictEqual(forwardSuccess, true, 'El evento encolado debe despacharse satisfactoriamente tras la recuperación');
      const updatedEvent = await queue.getEvent(queueEventId);
      assert.strictEqual(updatedEvent?.status, 'COMPLETED', 'El evento en cola debe quedar marcado como COMPLETED');

      console.log('  ✓ Test 2 superado: Aislamiento Store-and-Forward tolerante a 503 y conciliación automática verificada.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 3: Propagación simultánea de stock Factusol DISSTO a Shopify y Holded
    // ------------------------------------------------------------------------
    console.log('▶ TEST 3: Propagación concurrente de stock disponible Factusol (DISSTO) a Shopify y Holded');
    {
      const queue = new StoreAndForwardQueue({ storagePath: queueStoragePath });

      // Estado en Factusol: ACTSTO = 40 (físico), COMSTO = 15 (comprometido) => DISSTO = 25 (disponible)
      const factusolStockDB = new Map<string, { quantity: number; availableQuantity: number }>([
        ['ART-TALADRO-X', { quantity: 40, availableQuantity: 25 }],
      ]);

      const mockFactusol: IFactusolAdapter = {
        async readStock(options) {
          const results: CanonicalStock[] = [];
          for (const sku of options?.skus || []) {
            const data = factusolStockDB.get(sku);
            if (data) {
              results.push({
                sku,
                quantity: data.quantity, // ACTSTO (físico)
                availableQuantity: data.availableQuantity, // DISSTO (disponible)
                warehouse: 'GEN',
                lastUpdated: new Date(),
              });
            }
          }
          return results;
        },
        async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
          return { success: true, orderId: order.id, externalId: '999', orderNumber: '999' };
        },
        async decrementStock(articleId: string, quantity: number) {
          const current = factusolStockDB.get(articleId);
          if (current) {
            current.quantity -= quantity;
            current.availableQuantity -= quantity;
          }
        },
      };

      let shopifyReceivedUpdates: CanonicalStockUpdate[] = [];
      const mockShopify: IShopifyChannel = {
        async acknowledgeOrder() {},
        async pushStockBatch(updates: CanonicalStockUpdate[]) {
          shopifyReceivedUpdates = updates;
          return { success: true, updated: updates.length, total: updates.length, failed: 0 };
        },
      };

      let holdedReceivedUpdates: CanonicalStockUpdate[] = [];
      const mockHolded: IHoldedChannel = {
        async pushStockBatch(updates: CanonicalStockUpdate[]) {
          holdedReceivedUpdates = updates;
          return { success: true, updated: updates.length, total: updates.length, failed: 0 };
        },
      };

      const pipeline = new TripartitePipelineService({
        shopify: mockShopify,
        factusol: mockFactusol,
        holded: mockHolded,
        options: { queue, defaultWarehouse: 'GEN' },
      });

      // Venta directa en mostrador de Factusol de 5 unidades
      const directSaleRes = await pipeline.processDirectSale('ART-TALADRO-X', 5);

      // Verificaciones Test 3
      assert.strictEqual(directSaleRes.success, true);
      assert.strictEqual(directSaleRes.articleId, 'ART-TALADRO-X');
      assert.strictEqual(directSaleRes.quantitySold, 5);
      // El stock disponible era 25 - 5 = 20 (DISSTO). NO debe ser el físico (35).
      assert.strictEqual(directSaleRes.newAvailableQuantity, 20, 'Debe usar availableQuantity (DISSTO = 20), no físico');
      assert.strictEqual(directSaleRes.shopifySync.success, true);
      assert.strictEqual(directSaleRes.holdedSync.success, true);

      // Verificación de propagación a Shopify
      assert.strictEqual(shopifyReceivedUpdates.length, 1);
      assert.strictEqual(shopifyReceivedUpdates[0]?.sku, 'ART-TALADRO-X');
      assert.strictEqual(shopifyReceivedUpdates[0]?.availableStock, 20, 'Shopify debe recibir DISSTO disponible (20)');
      assert.strictEqual((shopifyReceivedUpdates[0] as any)?.availableQuantity, 20);

      // Verificación de propagación a Holded
      assert.strictEqual(holdedReceivedUpdates.length, 1);
      assert.strictEqual(holdedReceivedUpdates[0]?.sku, 'ART-TALADRO-X');
      assert.strictEqual(holdedReceivedUpdates[0]?.availableStock, 20, 'Holded debe recibir DISSTO disponible (20)');
      assert.strictEqual((holdedReceivedUpdates[0] as any)?.availableQuantity, 20);

      console.log('  ✓ Test 3 superado: Propagación simultánea de stock disponible DISSTO a Shopify y Holded certificada.\n');
    }

    // ------------------------------------------------------------------------
    // TEST 4: Blindaje Anti-Overselling (Insuficiente stock disponible)
    // ------------------------------------------------------------------------
    console.log('▶ TEST 4: Blindaje Anti-Overselling: Rechazo y registro de incidente ante stock DISSTO insuficiente');
    {
      const queue = new StoreAndForwardQueue({ storagePath: queueStoragePath });

      // En Factusol el stock disponible DISSTO es solo 2 unidades (aunque físico sea 10)
      const mockFactusol: IFactusolAdapter = {
        async readStock() {
          return [
            {
              sku: 'ART-ESCASA-99',
              quantity: 10, // Stock físico ACTSTO
              availableQuantity: 2, // Stock disponible DISSTO
              warehouse: 'GEN',
              lastUpdated: new Date(),
            },
          ];
        },
        async createOrder() {
          assert.fail('Factusol createOrder NUNCA debe ser invocado si no hay stock suficiente disponible');
        },
      };

      const mockHolded: IHoldedChannel = {
        async createSalesOrder() {
          assert.fail('Holded createSalesOrder NUNCA debe ser invocado si el pedido fue rechazado');
        },
      };

      const mockShopify: IShopifyChannel = {
        async acknowledgeOrder() {
          assert.fail('Shopify acknowledgeOrder NUNCA debe ser invocado para pedido sin stock');
        },
      };

      const pipeline = new TripartitePipelineService({
        shopify: mockShopify,
        factusol: mockFactusol,
        holded: mockHolded,
        options: { queue },
      });

      // Pedido solicita 5 unidades pero solo hay 2 disponibles
      const oversellOrder: CanonicalOrder = {
        id: 'gid://shopify/Order/999999',
        orderNumber: '#1003',
        series: 'W',
        reference: 'SHOP-1003',
        date: new Date(),
        status: 'processing',
        currency: 'EUR',
        customer: {
          id: 'cust_shop_99',
          fiscalName: 'Cliente Particular',
          hasEquivalenceSurcharge: false,
        },
        hasEquivalenceSurcharge: false,
        lines: [
          {
            id: 'line_over_1',
            position: 1,
            sku: 'ART-ESCASA-99',
            name: 'Artículo con alta demanda',
            quantity: 5, // Requiere 5, solo 2 disponibles
            unitPrice: 50.0,
            discountPercent: 0,
            vatPercent: 21.0,
            vatType: 0,
            subtotal: 250.0,
            total: 250.0,
          },
        ],
        netAmount: 250.0,
        taxAmount: 52.5,
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount: 302.5,
        warehouse: 'GEN',
      };

      const result = await pipeline.processShopifyOrder(oversellOrder);

      // Verificaciones Test 4
      assert.strictEqual(result.success, false, 'El pedido debe ser rechazado');
      assert.strictEqual(result.stockCheck.passed, false, 'Comprobación de stock debe fallar');
      assert.strictEqual(result.stockCheck.insufficientStockItems?.length, 1);
      assert.strictEqual(result.stockCheck.insufficientStockItems![0]!.requested, 5);
      assert.strictEqual(result.stockCheck.insufficientStockItems![0]!.available, 2);
      assert.strictEqual(result.incidentRegistered, true, 'Debe registrar incidente');
      assert.strictEqual(pipeline.getIncidents().length, 1, 'Incidente registrado en memoria');

      console.log('  ✓ Test 4 superado: Blindaje Anti-Overselling rechazó el pedido antes de tocar Factusol o Holded.\n');
    }

    console.log('======================================================================');
    console.log('✅ TODOS LOS TESTS DEL PIPELINE TRIPARTITO SUPERADOS EXITOSAMENTE (4/4)');
    console.log('======================================================================');
  } finally {
    // Teardown defensivo (Regla mandataria de tests)
    if (originalConfigPath !== undefined) {
      process.env.BENTIAN_CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.BENTIAN_CONFIG_PATH;
    }

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('❌ Error fatal en suite de pruebas tripartite-pipeline:', err);
  process.exit(1);
});
