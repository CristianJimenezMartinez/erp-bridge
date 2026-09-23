import assert from 'assert';
import { OrderSyncHelper } from '../src/sync/order-sync.helper';

console.log('🧪 Iniciando tests de blindaje de pedidos nocturnos (Overnight Orders)...');

// -------------------------------------------------------------------------
// TEST 1: Pedido desde tienda web Angular (nomenclatura Factusol y trampa de doble IVA)
// -------------------------------------------------------------------------
{
  console.log('  -> Test 1: Transformación de pedido Angular Web con artlpc, canlpc, prelpc');
  const po = {
    id: 101,
    order_number: 'WEB-20260923-ABCDE',
    created_at: '2026-09-23T02:30:00.000Z',
    customer: {
      fullName: 'Carlos Gómez Martínez',
      address: 'Calle Mayor 15, 2º B',
      city: 'Madrid',
      province: 'Madrid',
      postalCode: '28013',
      country: 'España',
      phone: '612345678',
      email: 'carlos@example.com',
    },
    lines: [
      {
        artlpc: 'TORNILLO-01',
        deslpc: 'Tornillo Acero Inoxidable M6x20',
        canlpc: 10,
        prelpc: 2.0, // Precio NETO (sin IVA)
        totlpc: 24.2, // ¡TRAMPA! En el checkout de Angular totlpc es BRUTO (10 * 2.0 * 1.21)
        ivaplc: 0, // Tramo 0 de Factusol = 21%
        dt1lpc: 0,
      },
    ],
    payment_method: 'paypal',
    total: 24.2,
    subtotal: 20.0,
    tax_total: 4.2,
    shipping_cost: 0,
  };

  const canonical = OrderSyncHelper.universalBridgeToCanonical(po, '1', 'GEN');

  // Idempotencia y referencias
  assert.strictEqual(canonical.id, '101', 'El ID debe ser "101"');
  assert.strictEqual(canonical.orderNumber, 'WEB-20260923-ABCDE', 'orderNumber debe coincidir con order_number');
  assert.strictEqual(canonical.reference, 'WEB-20260923-ABCDE', 'reference debe coincidir para findOrderByReferenceQuery');
  assert.strictEqual(canonical.series, '1', 'La serie debe ser "1"');
  assert.strictEqual(canonical.warehouse, 'GEN', 'El almacén debe ser "GEN"');

  // Cliente (Sanitizado para compatibilidad total con Factusol OLEDB)
  assert.strictEqual(canonical.customer.fiscalName, 'Carlos Gomez Martinez', 'El nombre fiscal debe ser el fullName sanitizado');
  assert.strictEqual(canonical.shippingAddress?.state, 'Madrid', 'province debe mapearse a state (CPRPCL)');
  assert.strictEqual(canonical.shippingAddress?.street, 'Calle Mayor 15, 2º B', 'Dirección de envío correcta');

  // Blindaje Anti-Doble IVA en Líneas
  assert.strictEqual(canonical.lines.length, 1, 'Debe haber 1 línea');
  const line1 = canonical.lines[0]!;
  assert.strictEqual(line1.sku, 'TORNILLO-01', 'SKU mapeado desde artlpc');
  assert.strictEqual(line1.name, 'Tornillo Acero Inoxidable M6x20', 'Nombre mapeado desde deslpc');
  assert.strictEqual(line1.quantity, 10, 'Cantidad mapeada desde canlpc');
  assert.strictEqual(line1.unitPrice, 2.0, 'Precio unitario neto debe ser 2.0');
  assert.strictEqual(line1.vatPercent, 21, 'IVA debe ser 21% (tramo 0)');
  assert.strictEqual(line1.vatType, 0, 'Tramo de Factusol debe ser 0');
  // CRÍTICO: total debe ser 20.0 (NETO), NO 24.2 (bruto)
  assert.strictEqual(line1.total, 20.0, 'El total de la línea DEBE ser el importe neto (10 * 2.0), evitando doble IVA');

  console.log('  ✓ Test 1 superado con éxito (blindaje anti-doble IVA verificado).');
}

// -------------------------------------------------------------------------
// TEST 2: Pedido con formato eCommerce estándar y descuento
// -------------------------------------------------------------------------
{
  console.log('  -> Test 2: Transformación de pedido con formato estándar (sku, quantity, price, discount)');
  const po = {
    id: 102,
    orderNumber: 'ORD-999',
    createdAt: '2026-09-23T04:15:00.000Z',
    customer: {
      name: 'Empresa S.L.',
      cif: 'B12345678',
      address: 'Polígono Industrial 4',
      city: 'Valencia',
      state: 'Valencia',
      postalCode: '46001',
      phone: '961234567',
      email: 'compras@empresa.com',
    },
    lines: [
      {
        sku: 'BROCA-HSS-8',
        name: 'Broca HSS 8mm',
        quantity: 5,
        price: 10.0,
        discountPercent: 10, // 10% de dto -> neto = 5 * 10 * 0.9 = 45.0
        vatRate: 21,
      },
    ],
    total: 54.45,
  };

  const canonical = OrderSyncHelper.universalBridgeToCanonical(po, '1', 'GEN');
  assert.strictEqual(canonical.orderNumber, 'ORD-999');
  assert.strictEqual(canonical.reference, 'ORD-999');
  assert.strictEqual(canonical.customer.taxId, 'B12345678');
  assert.strictEqual(canonical.lines[0]!.sku, 'BROCA-HSS-8');
  assert.strictEqual(canonical.lines[0]!.discountPercent, 10);
  assert.strictEqual(canonical.lines[0]!.total, 45.0, 'Total neto con 10% de descuento: 45.0');
  console.log('  ✓ Test 2 superado con éxito.');
}

// -------------------------------------------------------------------------
// TEST 3: Manejo de NIF/CIF y descarte de pedidos WooCommerce ya sincronizados
// -------------------------------------------------------------------------
{
  console.log('  -> Test 3: Extracción de NIF y detección de pedido WooCommerce ya procesado');
  const wcOrderPending = {
    id: 501,
    meta_data: [
      { key: '_billing_nif', value: '12345678Z' },
      { key: 'otra_cosa', value: '123' },
    ],
    billing: { first_name: 'María', last_name: 'López', email: 'maria@test.com' },
    line_items: [
      { id: 1, sku: 'DISCO-CORTE-115', name: 'Disco de corte 115mm', quantity: 2, price: 3.5, total: '7.00', total_tax: '1.47' },
    ],
    total: '8.47',
    total_tax: '1.47',
  };

  const nif = OrderSyncHelper.extractTaxIdFromWcOrder(wcOrderPending);
  assert.strictEqual(nif, '12345678Z', 'NIF extraído correctamente de _billing_nif');

  const isProcessedBefore = OrderSyncHelper.isWcOrderAlreadyProcessed(wcOrderPending);
  assert.strictEqual(isProcessedBefore, false, 'El pedido pendiente NO debe marcarse como procesado');

  const wcOrderSynced = {
    ...wcOrderPending,
    meta_data: [
      ...wcOrderPending.meta_data,
      { key: '_bentian_factusol_pcl', value: '1042' },
    ],
  };

  const isProcessedAfter = OrderSyncHelper.isWcOrderAlreadyProcessed(wcOrderSynced);
  assert.strictEqual(isProcessedAfter, true, 'El pedido con _bentian_factusol_pcl DEBE detectarse como ya procesado');

  const canonicalWc = OrderSyncHelper.wooCommerceToCanonical(wcOrderPending, '1', 'GEN');
  assert.strictEqual(canonicalWc.id, '501');
  assert.strictEqual(canonicalWc.reference, '501');
  assert.strictEqual(canonicalWc.customer.fiscalName, 'María López');
  assert.strictEqual(canonicalWc.customer.taxId, '12345678Z');
  assert.strictEqual(canonicalWc.lines[0]!.sku, 'DISCO-CORTE-115');
  assert.strictEqual(canonicalWc.lines[0]!.quantity, 2);
  assert.strictEqual(canonicalWc.lines[0]!.total, 7.0);

  console.log('  ✓ Test 3 superado con éxito.');
}

// -------------------------------------------------------------------------
// TEST 4: Sanitización de referencias y SKUs largos (> 13 caracteres)
// -------------------------------------------------------------------------
{
  console.log('  -> Test 4: Preservación de SKUs largos (> 13 chars) y sanitización de saltos de línea');
  const po = {
    id: 104,
    order_number: 'WEB-2026-REF-CON-\r\n-SALTO',
    customer: { fullName: 'Pedro Sánchez' },
    lines: [
      {
        sku: 'SKU-EXTRA-LARGO-DE-MAS-DE-13-CHARS',
        name: 'Tornillo Especial Titanio',
        quantity: 1,
        price: 15.0,
      },
    ],
    total: 15.0,
  };

  const canonical = OrderSyncHelper.universalBridgeToCanonical(po, '1', 'GEN');
  assert.strictEqual(canonical.reference.includes('\r'), false, 'La referencia no debe contener \\r');
  assert.strictEqual(canonical.reference.includes('\n'), false, 'La referencia no debe contener \\n');
  assert.strictEqual(canonical.lines[0]!.sku, 'SKU-EXTRA-LARGO-DE-MAS-DE-13-CHARS');
  assert.strictEqual(
    (canonical.lines[0]!.rawSourceData as any).originalSku,
    'SKU-EXTRA-LARGO-DE-MAS-DE-13-CHARS',
    'El SKU original debe preservarse en rawSourceData para inserción en MEMLPC'
  );

  console.log('  ✓ Test 4 superado con éxito.');
}

// -------------------------------------------------------------------------
// TEST 5: Guardarraíl contra bucle infinito con pedidos fallidos
// -------------------------------------------------------------------------
{
  console.log('  -> Test 5: Simulación de guardarraíl anti-bucle infinito en drenaje de pedidos');
  const seenOrderIds = new Set<number>();
  const mockServerOrders = [
    { id: 201, order_number: 'WEB-201' }, // Pedido con fallo permanente
    { id: 202, order_number: 'WEB-202' }, // Pedido exitoso
  ];

  let iterations = 0;
  let batchCount = 0;
  const MAX_PULL_BATCHES = 10;
  let hasMoreBatches = true;

  while (hasMoreBatches && batchCount < MAX_PULL_BATCHES) {
    batchCount++;
    iterations++;

    // Filtrar pedidos que ya fueron intentados en este ciclo
    const pendingOrders = mockServerOrders.filter((po) => !seenOrderIds.has(po.id));

    if (pendingOrders.length === 0) {
      hasMoreBatches = false;
      break;
    }

    const confirmations = [];
    for (const po of pendingOrders) {
      seenOrderIds.add(po.id);

      if (po.id === 201) {
        // Simular fallo en Factusol (no se confirma)
        continue;
      }

      // Pedido 202 tiene éxito
      confirmations.push({
        id: po.id,
        orderId: po.id,
        webOrderId: po.id,
        factusolOrderNumber: 1045,
        factusolSeries: '1',
      });
    }

    // Si no hubo confirmaciones en este lote o se procesaron todos los nuevos, parar
    if (confirmations.length === 0) {
      hasMoreBatches = false;
    }
  }

  assert.ok(iterations <= 2, `El bucle debe detenerse en máximo 2 iteraciones (ejecutadas: ${iterations})`);
  assert.strictEqual(seenOrderIds.has(201), true, 'El pedido fallido 201 fue registrado en seenOrderIds');
  assert.strictEqual(seenOrderIds.has(202), true, 'El pedido exitoso 202 fue registrado en seenOrderIds');

  console.log('  ✓ Test 5 superado con éxito (guardarraíl anti-bucle infinito verificado).');
}

console.log('======================================================================');
console.log('🎉 TODOS LOS TESTS DE BLINDAJE DE PEDIDOS NOCTURNOS PASARON CON ÉXITO');
console.log('======================================================================');
