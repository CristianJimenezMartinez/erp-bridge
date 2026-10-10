import assert from 'assert';
import {
  CanonicalCustomer,
  CanonicalOrder,
} from '@erp-bridge/shared';
import {
  CanonicalStockUpdate,
  HoldedClient,
  HoldedConnector,
  HoldedMapper,
  HoldedProduct,
  HoldedRateLimiter,
} from '../src';

console.log('--- Iniciando Suite de Pruebas: Holded ERP Connector ---');

async function runTests() {
  const originalFetch = globalThis.fetch;

  try {
    // =========================================================================
    // 1. Rate Limiter (250 req/min throttle)
    // =========================================================================
    console.log('\n▶ Test 1: Rate Limiter (250 req/min throttle y token bucket)...');
    const rateLimiter = new HoldedRateLimiter(250);

    const initialStatus = rateLimiter.getStatus();
    assert.strictEqual(initialStatus.limit, 250, 'El límite debe ser 250 req/min');
    assert.strictEqual(initialStatus.remaining, 250, 'Inicialmente el bucket debe estar lleno');

    // Consumir 1 token normalmente
    const waitZero = await rateLimiter.acquire(1);
    assert.strictEqual(waitZero, 0, 'No debe pausar cuando hay tokens disponibles');
    assert.strictEqual(rateLimiter.getStatus().remaining, 249);

    // Vaciar el bucket para probar la pausa automática
    rateLimiter.setTokens(0);
    assert.strictEqual(rateLimiter.getStatus().remaining, 0);

    // Adquirir 1 token con bucket vacío -> debe pausar automáticamente
    const startAcquire = Date.now();
    const waitMs = await rateLimiter.acquire(1);
    const elapsed = Date.now() - startAcquire;

    assert.ok(waitMs >= 50, `Debe calcular un tiempo de espera mínimo (calculó ${waitMs}ms)`);
    assert.ok(elapsed >= 40, `Debe haber esperado en la llamada (esperó ${elapsed}ms)`);
    console.log(`  ✓ Rate limiter throttle verificado (pausó ${waitMs}ms ante bucket agotado)`);

    // =========================================================================
    // 2. Conexión y autenticación (testConnection y manejo de 401)
    // =========================================================================
    console.log('\n▶ Test 2: Conexión y autenticación (testConnection y manejo de 401)...');
    const mockConfig = {
      apiKey: 'test_holded_api_key_abcdef123456',
      endpointUrl: 'https://api.holded.com/api/v1',
    };

    // Caso A: Conexión exitosa
    globalThis.fetch = async (url: any, init?: any): Promise<any> => {
      const urlStr = url.toString();
      const headers = (init?.headers || {}) as Record<string, string>;
      assert.strictEqual(headers['key'], 'test_holded_api_key_abcdef123456', 'Cabecera key obligatoria');

      if (urlStr.includes('/invoicing/v1/contacts')) {
        return new Response(JSON.stringify([{ id: 'c1', name: 'Test Contact' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not Found', { status: 404 });
    };

    const client = new HoldedClient(mockConfig);
    const connector = new HoldedConnector(mockConfig, client);

    assert.strictEqual(connector.id, 'conn_holded');
    assert.strictEqual(connector.name, 'Holded ERP Cloud Connector');
    assert.strictEqual(connector.type, 'BIDIRECTIONAL');

    const connSuccess = await connector.testConnection();
    assert.strictEqual(connSuccess.success, true, 'testConnection debe ser exitoso');
    assert.ok(connSuccess.latencyMs >= 0);
    console.log(`  ✓ Conexión exitosa verificada (latencia: ${connSuccess.latencyMs}ms)`);

    // Caso B: Manejo de 401 Unauthorized
    globalThis.fetch = async (): Promise<any> => {
      return new Response(JSON.stringify({ status: 0, message: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const badClient = new HoldedClient({ apiKey: 'invalid_key' });
    const badConnector = new HoldedConnector({ apiKey: 'invalid_key' }, badClient);

    const connFail = await badConnector.testConnection();
    assert.strictEqual(connFail.success, false, 'testConnection debe fallar con clave errónea');

    let threw401 = false;
    try {
      await badClient.request('/invoicing/v1/contacts');
    } catch (err: unknown) {
      threw401 = (err as Error).message.includes('401 Unauthorized');
    }
    assert.ok(threw401, 'Debe lanzar un error descriptivo de 401 Unauthorized');
    console.log('  ✓ Error 401 capturado y reportado de forma descriptiva');

    // =========================================================================
    // 3. Mapeo de productos y stock disponible (Anti-Overselling)
    // =========================================================================
    console.log('\n▶ Test 3: Mapeo de productos y stock disponible (availableQuantity DISSTO)...');
    const rawHoldedProduct: HoldedProduct = {
      id: 'prod_991',
      sku: 'BRO-HORM-10',
      name: 'Broca Hormigón 10mm SDS-Plus',
      desc: 'Broca profesional de 4 cortes',
      price: 12.5,
      cost: 5.2,
      tax: 21,
      stock: 45,
      barcode: '8436001234567',
    };

    const canonicalProduct = HoldedMapper.mapHoldedProductToCanonical(rawHoldedProduct);
    assert.strictEqual(canonicalProduct.id, 'prod_991');
    assert.strictEqual(canonicalProduct.sku, 'BRO-HORM-10');
    assert.strictEqual(canonicalProduct.name, 'Broca Hormigón 10mm SDS-Plus');
    assert.strictEqual(canonicalProduct.regularPrice, 12.5);
    assert.strictEqual(canonicalProduct.costPrice, 5.2);
    assert.strictEqual(canonicalProduct.stockQuantity, 45);
    assert.strictEqual(canonicalProduct.inStock, true);
    assert.strictEqual(canonicalProduct.taxRate, 21);
    assert.strictEqual(canonicalProduct.barcode, '8436001234567');
    console.log('  ✓ Producto de Holded mapeado a CanonicalProduct correctamente');

    // Mapeo de Stock: Anti-Overselling usando availableQuantity (DISSTO)
    const stockUpdateWithAvailable: CanonicalStockUpdate = {
      sku: 'BRO-HORM-10',
      quantity: 50, // Stock físico
      availableQuantity: 38, // Stock disponible tras restar pedidos comprometidos
      warehouse: 'ALM_CENTRAL',
    };

    const mappedHoldedStock = HoldedMapper.mapCanonicalStockToHolded('BRO-HORM-10', stockUpdateWithAvailable);
    assert.strictEqual(mappedHoldedStock.sku, 'BRO-HORM-10');
    assert.strictEqual(mappedHoldedStock.stock, 38, 'Debe priorizar availableQuantity (38) sobre quantity (50)');
    assert.strictEqual(mappedHoldedStock.warehouseId, 'ALM_CENTRAL');

    // Probar pushStockBatch en connector con availableQuantity
    let updatedStockPayload: any = null;
    globalThis.fetch = async (url: any, init?: any): Promise<any> => {
      const urlStr = url.toString();
      if (urlStr.includes('/stock')) {
        updatedStockPayload = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ status: 1, info: 'Stock updated' }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    };

    const batchRes = await connector.pushStockBatch([stockUpdateWithAvailable]);
    assert.strictEqual(batchRes.success, true);
    assert.strictEqual(batchRes.updated, 1);
    assert.strictEqual(updatedStockPayload?.stock, 38, 'La llamada API debe enviar el stock disponible');
    console.log('  ✓ Blindaje Anti-Overselling verificado en mapper y pushStockBatch');

    // =========================================================================
    // 4. Mapeo de pedidos de venta con IVA (21%) y Recargo de Equivalencia (5.2%)
    // =========================================================================
    console.log('\n▶ Test 4: Mapeo de pedidos de venta con IVA y Recargo de Equivalencia...');
    const canonicalOrderWithRE: CanonicalOrder = {
      id: 'order_web_1001',
      orderNumber: 'WEB-1001',
      series: 'B',
      reference: 'PEDIDO-TIENDA-1001',
      date: new Date('2026-10-10T10:00:00Z'),
      status: 'processing',
      hasEquivalenceSurcharge: true, // Aplica Recargo de Equivalencia
      equivalenceSurchargeRate: 5.2,
      currency: 'EUR',
      netAmount: 120.0,
      taxAmount: 32.7,
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount: 152.7,
      warehouse: 'GEN',
      customer: {
        id: 'cust_882',
        customerNumber: 'CLI-882',
        taxId: '12345678Z',
        fiscalName: 'Ferretería García',
        commercialName: 'Ferretería García',
        email: 'info@ferreteriagarcia.es',
        phone: '600123456',
        hasEquivalenceSurcharge: true,
      },
      lines: [
        {
          id: 'line_1',
          position: 1,
          sku: 'ART-21',
          name: 'Pintura Blanca 15L (IVA 21%)',
          quantity: 2,
          unitPrice: 50.0,
          discountPercent: 0,
          vatPercent: 21,
          vatType: 0,
          subtotal: 100.0,
          total: 126.2,
        },
        {
          id: 'line_2',
          position: 2,
          sku: 'ART-10',
          name: 'Semillas Agrícolas (IVA 10%)',
          quantity: 1,
          unitPrice: 20.0,
          discountPercent: 0,
          vatPercent: 10,
          vatType: 1,
          subtotal: 20.0,
          total: 22.28,
        },
      ],
    };

    const holdedSalesOrder = HoldedMapper.mapCanonicalOrderToHoldedSalesOrder(canonicalOrderWithRE, 'ALM_DEFAULT');
    assert.strictEqual(holdedSalesOrder.contactId, 'cust_882');
    assert.strictEqual(holdedSalesOrder.contactCode, '12345678Z');
    assert.strictEqual(holdedSalesOrder.desc, 'PEDIDO-TIENDA-1001');
    assert.strictEqual(holdedSalesOrder.warehouseId, 'ALM_DEFAULT');
    assert.strictEqual(holdedSalesOrder.items.length, 2);

    // Línea 1: IVA 21% -> R.E. 5.2%
    const item1 = holdedSalesOrder.items[0];
    assert.strictEqual(item1?.sku, 'ART-21');
    assert.strictEqual(item1?.units, 2);
    assert.strictEqual(item1?.subtotal, 50.0);
    assert.strictEqual(item1?.tax, 21, 'IVA debe ser 21%');
    assert.strictEqual(item1?.re, 5.2, 'Recargo de Equivalencia debe ser 5.2%');

    // Línea 2: IVA 10% -> R.E. 1.4%
    const item2 = holdedSalesOrder.items[1];
    assert.strictEqual(item2?.sku, 'ART-10');
    assert.strictEqual(item2?.units, 1);
    assert.strictEqual(item2?.subtotal, 20.0);
    assert.strictEqual(item2?.tax, 10, 'IVA debe ser 10%');
    assert.strictEqual(item2?.re, 1.4, 'Recargo de Equivalencia debe ser 1.4%');

    // Probar pedido sin R.E.
    const canonicalOrderNoRE: CanonicalOrder = {
      ...canonicalOrderWithRE,
      hasEquivalenceSurcharge: false,
      customer: { ...canonicalOrderWithRE.customer, hasEquivalenceSurcharge: false },
    };
    const holdedOrderNoRE = HoldedMapper.mapCanonicalOrderToHoldedSalesOrder(canonicalOrderNoRE);
    assert.strictEqual(holdedOrderNoRE.items[0]?.re, 0, 'Sin R.E. el recargo debe ser 0%');
    console.log('  ✓ CanonicalTax (IVA 21%/10% y R.E. 5.2%/1.4%) aplicado con precisión');

    // =========================================================================
    // 5. Ingesta de contactos de clientes con NIF/email
    // =========================================================================
    console.log('\n▶ Test 5: Ingesta de contactos de clientes con NIF/email...');
    const companyCustomer: CanonicalCustomer = {
      id: 'cust_empresa_1',
      taxId: 'B98765432', // CIF de Sociedad Limitada
      fiscalName: 'Construcciones Levante S.L.',
      commercialName: 'Levante Construcción',
      email: 'facturacion@levanteconstruccion.es',
      phone: '+34961234567',
      hasEquivalenceSurcharge: false,
      address: {
        street: 'Avenida del Puerto 45',
        city: 'Valencia',
        postalCode: '46024',
        state: 'Valencia',
        country: 'ES',
      },
    };

    const companyContact = HoldedMapper.mapCanonicalCustomerToHoldedContact(companyCustomer);
    assert.strictEqual(companyContact.name, 'Construcciones Levante S.L.');
    assert.strictEqual(companyContact.code, 'B98765432');
    assert.strictEqual(companyContact.email, 'facturacion@levanteconstruccion.es');
    assert.strictEqual(companyContact.mobile, '+34961234567');
    assert.strictEqual(companyContact.type, 'client');
    assert.strictEqual(companyContact.isperson, false, 'Sociedad con CIF B debe tener isperson = false');
    assert.strictEqual(companyContact.billAddress?.postalCode, '46024');

    const personCustomer: CanonicalCustomer = {
      id: 'cust_persona_1',
      taxId: '44556677X', // DNI
      fiscalName: 'Juan Pérez Gómez',
      email: 'juan.perez@gmail.com',
      phone: '611223344',
      hasEquivalenceSurcharge: false,
    };

    const personContact = HoldedMapper.mapCanonicalCustomerToHoldedContact(personCustomer);
    assert.strictEqual(personContact.isperson, true, 'Autónomo/Particular con DNI debe tener isperson = true');
    console.log('  ✓ Contactos de clientes (Persona física vs jurídica) mapeados correctamente');

    // =========================================================================
    // 6. Resiliencia ante caídas de red o errores HTTP 429/500
    // =========================================================================
    console.log('\n▶ Test 6: Resiliencia ante caídas de red o errores HTTP 429/500...');

    // Subtest 6.1: HTTP 429 con Retry-After y recuperación
    let attempt429 = 0;
    globalThis.fetch = async (): Promise<any> => {
      attempt429++;
      if (attempt429 === 1) {
        return new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '0.1' }, // 100ms de pausa
        });
      }
      return new Response(JSON.stringify([{ id: 'p1', name: 'Product Recovered' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const resilientClient = new HoldedClient(mockConfig);
    const recoveredProducts = await resilientClient.getProducts({ limit: 1 });
    assert.strictEqual(attempt429, 2, 'Debe reintentar tras HTTP 429');
    assert.strictEqual(recoveredProducts.length, 1);
    console.log('  ✓ Recuperación automática ante HTTP 429 con Retry-After verificada');

    // Subtest 6.2: HTTP 500 con recuperación en reintento
    let attempt500 = 0;
    globalThis.fetch = async (): Promise<any> => {
      attempt500++;
      if (attempt500 === 1) {
        return new Response('Internal Server Error', { status: 500 });
      }
      return new Response(JSON.stringify({ status: 1, id: 'order_new_1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const orderResult = await resilientClient.createSalesOrder(holdedSalesOrder);
    assert.strictEqual(attempt500, 2, 'Debe reintentar tras HTTP 500');
    assert.strictEqual(orderResult.id, 'order_new_1');
    console.log('  ✓ Recuperación automática ante HTTP 500 con backoff exponencial');

    // Subtest 6.3: Agotamiento de reintentos
    globalThis.fetch = async (): Promise<any> => {
      throw new Error('ECONNRESET connection reset by peer');
    };

    let exhaustedFailed = false;
    try {
      await resilientClient.getProducts();
    } catch (err: unknown) {
      exhaustedFailed = (err as Error).message.includes('ECONNRESET');
    }
    assert.ok(exhaustedFailed, 'Debe lanzar excepción cuando se agotan los reintentos');
    console.log('  ✓ Agotamiento de intentos y reporte de error de red verificado');

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS DE HOLDED PASARON SATISFACTORIAMENTE');
    console.log('======================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('❌ Error en test suite de Holded:', err);
  process.exit(1);
});
