import assert from 'assert';
import { AccessDriver } from '@erp-bridge/connector-factusol';
import { OrderSyncHelper } from '../src/sync/order-sync.helper';
import { CancellationSyncHelper } from '../src/sync/cancellation-sync.helper';

console.log('🧪 Iniciando tests de Sincronización Inversa y Pedidos Cancelados/Reembolsados...');

// -------------------------------------------------------------------------
// TEST 1: Detección de pedidos WooCommerce cancelados/reembolsados pendientes de reposición
// -------------------------------------------------------------------------
{
  console.log('  -> Test 1: Comprobación de metadatos WooCommerce para reposición de stock');

  // Pedido activo normal (no cancelado)
  const activeOrder = {
    id: 100,
    status: 'processing',
    meta_data: [{ key: '_bentian_factusol_pcl', value: '101' }],
  };
  const resActive = OrderSyncHelper.isWcOrderCancelledNeedingRestock(activeOrder);
  assert.strictEqual(resActive.needsRestock, false, 'Un pedido en proceso no debe requerir reposición');

  // Pedido cancelado pero sin pedido Factusol (nunca se importó)
  const noFactusolOrder = {
    id: 101,
    status: 'cancelled',
    meta_data: [{ key: 'otro_meta', value: 'valor' }],
  };
  const resNoFact = OrderSyncHelper.isWcOrderCancelledNeedingRestock(noFactusolOrder);
  assert.strictEqual(resNoFact.needsRestock, false, 'Un pedido sin número Factusol no puede reponerse');

  // Pedido cancelado con Factusol pero ya repuesto previamente
  const alreadyCancelledOrder = {
    id: 102,
    status: 'cancelled',
    meta_data: [
      { key: '_bentian_factusol_pcl', value: '102' },
      { key: '_bentian_factusol_cancelled', value: '1' },
    ],
  };
  const resAlready = OrderSyncHelper.isWcOrderCancelledNeedingRestock(alreadyCancelledOrder);
  assert.strictEqual(resAlready.needsRestock, false, 'Un pedido ya marcado con _bentian_factusol_cancelled no debe reponerse de nuevo');

  // Pedido cancelado que sí requiere reposición
  const cancelledNeedingRestock = {
    id: 103,
    status: 'cancelled',
    meta_data: [{ key: '_bentian_factusol_pcl', value: '1055' }],
  };
  const resCancelled = OrderSyncHelper.isWcOrderCancelledNeedingRestock(cancelledNeedingRestock);
  assert.strictEqual(resCancelled.needsRestock, true, 'El pedido cancelado con PCL debe requerir reposición');
  assert.strictEqual(resCancelled.factusolOrderNumber, 1055, 'El número de pedido Factusol debe ser 1055');

  // Pedido reembolsado que sí requiere reposición
  const refundedNeedingRestock = {
    id: 104,
    status: 'refunded',
    meta_data: [{ key: '_bentian_factusol_pcl', value: '2080' }],
  };
  const resRefunded = OrderSyncHelper.isWcOrderCancelledNeedingRestock(refundedNeedingRestock);
  assert.strictEqual(resRefunded.needsRestock, true, 'El pedido reembolsado con PCL debe requerir reposición');
  assert.strictEqual(resRefunded.factusolOrderNumber, 2080, 'El número de pedido Factusol debe ser 2080');

  console.log('  ✓ Test 1 superado con éxito.');
}

// -------------------------------------------------------------------------
// TEST 2: Reposición atómica de stock en Factusol y actualización de ESTPCL = 3
// -------------------------------------------------------------------------
(async () => {
  console.log('  -> Test 2: Generación y ejecución de sentencias atómicas de reposición en Factusol');

  const executedSqls: string[][] = [];

  // Mock de AccessDriver
  const mockDriver = {
    query: async <T>(sql: string): Promise<T[]> => {
      if (sql.includes('SELECT ALMPCL, ESTPCL FROM F_PCL')) {
        return [{ ALMPCL: 'AL1', ESTPCL: 0 }] as unknown as T[];
      }
      if (sql.includes('SELECT ARTLPC, CANLPC FROM F_LPC')) {
        return [
          { ARTLPC: 'BROCA-HSS-8', CANLPC: 4 },
          { ARTLPC: 'DISCO-115', CANLPC: 2 },
        ] as unknown as T[];
      }
      return [] as T[];
    },
    executeTransaction: async (sqls: string[]): Promise<void> => {
      executedSqls.push(sqls);
    },
  } as unknown as AccessDriver;

  const result = await CancellationSyncHelper.restoreFactusolOrderStock(
    mockDriver,
    1042,
    '1',
    'GEN'
  );

  assert.strictEqual(result.alreadyCancelled, false, 'El pedido no estaba cancelado previamente');
  assert.strictEqual(result.linesRestocked, 2, 'Deben haberse repuesto 2 artículos');
  assert.strictEqual(executedSqls.length, 1, 'Debe haberse ejecutado 1 transacción atómica');

  const batch = executedSqls[0]!;
  assert.strictEqual(batch.length, 3, 'La transacción debe contener 3 sentencias (1 estado + 2 stocks)');

  // Sentencia 1: Estado del pedido a cancelado (ESTPCL = 3)
  assert.ok(
    batch[0]!.includes('UPDATE F_PCL SET ESTPCL = 3 WHERE CODPCL = 1042 AND TIPPCL = \'1\''),
    'La primera sentencia debe actualizar ESTPCL = 3 en F_PCL'
  );

  // Sentencia 2 y 3: Reposición de existencias en F_STO
  assert.ok(
    batch[1]!.includes('UPDATE F_STO SET DISSTO = DISSTO + 4 WHERE ARTSTO = \'BROCA-HSS-8\' AND ALMSTO = \'AL1\''),
    'Debe incrementar stock de BROCA-HSS-8 en el almacén AL1'
  );
  assert.ok(
    batch[2]!.includes('UPDATE F_STO SET DISSTO = DISSTO + 2 WHERE ARTSTO = \'DISCO-115\' AND ALMSTO = \'AL1\''),
    'Debe incrementar stock de DISCO-115 en el almacén AL1'
  );

  console.log('  ✓ Test 2 superado con éxito.');
})()
  .then(async () => {
    // -------------------------------------------------------------------------
    // TEST 3: Guardarraíl anti-doble reposición (si ya está cancelado en Factusol)
    // -------------------------------------------------------------------------
    console.log('  -> Test 3: Guardarraíl anti-doble reposición de stock');

    let txExecuted = false;
    const mockDriverAlreadyCancelled = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes('SELECT ALMPCL, ESTPCL FROM F_PCL')) {
          // Ya está en estado 3 (anulado)
          return [{ ALMPCL: 'GEN', ESTPCL: 3 }] as unknown as T[];
        }
        return [] as T[];
      },
      executeTransaction: async (): Promise<void> => {
        txExecuted = true;
      },
    } as unknown as AccessDriver;

    const result = await CancellationSyncHelper.restoreFactusolOrderStock(
      mockDriverAlreadyCancelled,
      1042,
      '1',
      'GEN'
    );

    assert.strictEqual(result.alreadyCancelled, true, 'Debe detectar que el pedido ya estaba cancelado');
    assert.strictEqual(result.linesRestocked, 0, 'No debe reponer líneas');
    assert.strictEqual(txExecuted, false, 'No debe ejecutar transacciones de stock repetidas');

    console.log('  ✓ Test 3 superado con éxito.');
  })
  .then(async () => {
    // -------------------------------------------------------------------------
    // TEST 4: Sincronización completa con Universal Bridge (pull_cancelled_orders -> restore -> ack)
    // -------------------------------------------------------------------------
    console.log('  -> Test 4: Flujo completo de Universal Bridge para pedidos cancelados');

    let ackPayloadSent: any = null;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: any, init?: any): Promise<any> => {
      const urlStr = String(url);
      if (urlStr.includes('action=pull_cancelled_orders')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            orders: [
              {
                id: 88,
                order_number: 'WEB-2026-88',
                factusol_order_number: 9001,
                factusol_series: '1',
                lines: [{ sku: 'TORNILLO-INOX', quantity: 100 }],
              },
            ],
          }),
        };
      }
      if (urlStr.includes('action=ack_cancelled_orders')) {
        ackPayloadSent = JSON.parse(init?.body || '{}');
        return {
          ok: true,
          json: async () => ({ success: true, count: 1 }),
        };
      }
      return { ok: false, status: 404 };
    }) as any;

    const mockDriver = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes('SELECT ALMPCL, ESTPCL FROM F_PCL')) {
          return [{ ALMPCL: 'GEN', ESTPCL: 0 }] as unknown as T[];
        }
        if (sql.includes('SELECT ARTLPC, CANLPC FROM F_LPC')) {
          return [{ ARTLPC: 'TORNILLO-INOX', CANLPC: 100 }] as unknown as T[];
        }
        return [] as T[];
      },
      executeTransaction: async (): Promise<void> => {},
    } as unknown as AccessDriver;

    try {
      const res = await CancellationSyncHelper.syncUniversalBridgeCancellations({
        endpointUrl: 'https://www.suministrosrubio.com/erp-bridge-endpoint.php',
        headers: { Authorization: 'Bearer test' },
        driver: mockDriver,
        orderSeries: '1',
        defaultWarehouse: 'GEN',
      });

      assert.strictEqual(res.ordersCancelled, 1, 'Debe procesar 1 pedido cancelado');
      assert.strictEqual(res.itemsRestocked, 1, 'Debe reponer 1 línea');
      assert.ok(ackPayloadSent !== null, 'Debe llamar a ack_cancelled_orders');
      assert.strictEqual(ackPayloadSent.confirmations.length, 1);
      assert.strictEqual(ackPayloadSent.confirmations[0].id, 88);
      assert.strictEqual(ackPayloadSent.confirmations[0].factusolOrderNumber, 9001);

      console.log('  ✓ Test 4 superado con éxito.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  })
  .then(async () => {
    // -------------------------------------------------------------------------
    // TEST 5: Sincronización completa con WooCommerce (status=cancelled -> restore -> PUT metadata)
    // -------------------------------------------------------------------------
    console.log('  -> Test 5: Flujo completo de WooCommerce para pedidos cancelados/reembolsados');

    let putMetadataSent: any = null;
    let putUrlCalled = '';
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: any, init?: any): Promise<any> => {
      const urlStr = String(url);
      if (urlStr.includes('/wp-json/wc/v3/orders?') && init?.headers) {
        if (urlStr.includes('status=cancelled')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 777,
                status: 'cancelled',
                meta_data: [{ key: '_bentian_factusol_pcl', value: '4455' }],
                line_items: [{ sku: 'LIJA-P120', quantity: 10 }],
              },
            ],
          };
        }
        return { ok: true, json: async () => [] };
      }
      if (urlStr.includes('/wp-json/wc/v3/orders/777') && init?.method === 'PUT') {
        putUrlCalled = urlStr;
        putMetadataSent = JSON.parse(init?.body || '{}');
        return { ok: true, json: async () => ({ id: 777 }) };
      }
      return { ok: false, status: 404 };
    }) as any;

    const mockDriver = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes('SELECT ALMPCL, ESTPCL FROM F_PCL')) {
          return [{ ALMPCL: 'GEN', ESTPCL: 0 }] as unknown as T[];
        }
        if (sql.includes('SELECT ARTLPC, CANLPC FROM F_LPC')) {
          return [{ ARTLPC: 'LIJA-P120', CANLPC: 10 }] as unknown as T[];
        }
        return [] as T[];
      },
      executeTransaction: async (): Promise<void> => {},
    } as unknown as AccessDriver;

    try {
      const res = await CancellationSyncHelper.syncWooCommerceCancellations({
        storeUrl: 'https://tienda-ejemplo.com',
        authHeader: 'Basic dGVzdDp0ZXN0',
        driver: mockDriver,
        orderSeries: '1',
        defaultWarehouse: 'GEN',
      });

      assert.strictEqual(res.ordersCancelled, 1, 'Debe procesar 1 pedido cancelado de WooCommerce');
      assert.strictEqual(res.itemsRestocked, 1, 'Debe reponer 1 artículo');
      assert.ok(putMetadataSent !== null, 'Debe actualizar metadatos del pedido en WooCommerce vía PUT');
      assert.strictEqual(putMetadataSent.meta_data[0].key, '_bentian_factusol_cancelled');
      assert.strictEqual(putMetadataSent.meta_data[0].value, '1');
      assert.ok(putUrlCalled.endsWith('/orders/777'), 'Debe actualizar el pedido correcto');

      console.log('  ✓ Test 5 superado con éxito.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  })
  .then(() => {
    console.log('======================================================================');
    console.log('🎉 TODOS LOS TESTS DE SINCRONIZACIÓN INVERSA PASARON CON ÉXITO');
    console.log('======================================================================');
  })
  .catch((err) => {
    console.error('❌ Error en tests de cancelación:', err);
    process.exit(1);
  });
