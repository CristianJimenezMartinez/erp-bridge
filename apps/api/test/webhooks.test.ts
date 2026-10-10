import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import { bootstrapApp } from '../src/server';

async function runWebhooksTests(): Promise<void> {
  console.log('--- Iniciando suite de tests para Webhooks en Tiempo Real (Shopify & Holded) ---');

  process.env['NODE_ENV'] = 'test';
  process.env['DISABLE_MAILING'] = 'true';

  const SHOPIFY_TEST_SECRET = 'test_shopify_webhook_secret_99887766554433221100';
  const HOLDED_TEST_SECRET = 'test_holded_webhook_secret_aabbccddeeff0011223344';

  process.env['SHOPIFY_WEBHOOK_SECRET'] = SHOPIFY_TEST_SECRET;
  process.env['HOLDED_WEBHOOK_SECRET'] = HOLDED_TEST_SECRET;

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ==========================================
    // 1. TESTS DE WEBHOOKS SHOPIFY
    // ==========================================
    console.log('\n[1] Probando Shopify Webhook: /api/webhooks/shopify/orders-create');

    const sampleOrderPayload = {
      id: 820982911946154500,
      order_number: 1001,
      name: '#1001',
      total_price: '159.90',
      currency: 'EUR',
      customer: {
        id: 11223344,
        email: 'cliente@ejemplo.com',
        first_name: 'Juan',
        last_name: 'Pérez',
      },
    };
    const orderPayloadString = JSON.stringify(sampleOrderPayload);

    // 1.1 Rechazo sin cabecera x-shopify-hmac-sha256 (HTTP 401)
    console.log('  -> 1.1 Solicitud sin cabecera HMAC (debe responder 401)...');
    const resShopifyNoHmac = await fetch(`${baseUrl}/api/webhooks/shopify/orders-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: orderPayloadString,
    });
    assert.strictEqual(resShopifyNoHmac.status, 401, 'Debe devolver 401 si falta x-shopify-hmac-sha256');
    const jsonShopifyNoHmac = (await resShopifyNoHmac.json()) as any;
    assert.ok(jsonShopifyNoHmac.error, 'La respuesta debe contener un mensaje de error');
    console.log('  ✓ 1.1 Superado (401 devuelto correctamente sin cabecera HMAC).');

    // 1.2 Rechazo con firma HMAC inválida (HTTP 401)
    console.log('  -> 1.2 Solicitud con firma HMAC manipulada/errónea (debe responder 401)...');
    const fakeHmac = crypto.createHmac('sha256', 'wrong_secret').update(orderPayloadString).digest('base64');
    const resShopifyBadHmac = await fetch(`${baseUrl}/api/webhooks/shopify/orders-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': fakeHmac,
      },
      body: orderPayloadString,
    });
    assert.strictEqual(resShopifyBadHmac.status, 401, 'Debe devolver 401 si la firma HMAC no coincide');
    console.log('  ✓ 1.2 Superado (401 devuelto con firma HMAC alterada).');

    // 1.3 Aceptación con firma HMAC válida Base64 (HTTP 200)
    console.log('  -> 1.3 Solicitud con firma HMAC válida estándar Shopify (Base64) (debe responder 200)...');
    const validHmacBase64 = crypto
      .createHmac('sha256', SHOPIFY_TEST_SECRET)
      .update(orderPayloadString)
      .digest('base64');

    const resShopifyValid = await fetch(`${baseUrl}/api/webhooks/shopify/orders-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': validHmacBase64,
      },
      body: orderPayloadString,
    });
    assert.strictEqual(resShopifyValid.status, 200, 'Debe devolver 200 con firma HMAC válida');
    const jsonShopifyValid = (await resShopifyValid.json()) as any;
    assert.strictEqual(jsonShopifyValid.success, true);
    assert.strictEqual(jsonShopifyValid.event, 'ORDER_CREATED');
    assert.ok(jsonShopifyValid.eventId, 'Debe generar un eventId en EventBus');
    console.log('  ✓ 1.3 Superado (200 devuelto y evento ORDER_CREATED emitido correctamente).');

    // 1.4 Aceptación con firma HMAC válida Hexadecimal (HTTP 200)
    console.log('  -> 1.4 Solicitud con firma HMAC válida formato Hex (debe responder 200)...');
    const validHmacHex = crypto
      .createHmac('sha256', SHOPIFY_TEST_SECRET)
      .update(orderPayloadString)
      .digest('hex');

    const resShopifyValidHex = await fetch(`${baseUrl}/api/webhooks/shopify/orders-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': validHmacHex,
      },
      body: orderPayloadString,
    });
    assert.strictEqual(resShopifyValidHex.status, 200, 'Debe aceptar firma en formato hexadecimal');
    console.log('  ✓ 1.4 Superado (200 aceptado con HMAC hex).');

    // 1.5 Shopify Stock/Inventory Update (HTTP 200)
    console.log('\n[2] Probando Shopify Webhook: /api/webhooks/shopify/inventory-levels-update');
    const sampleStockPayload = {
      inventory_item_id: 99182312,
      location_id: 10293,
      available: 42,
    };
    const stockPayloadString = JSON.stringify(sampleStockPayload);
    const stockHmac = crypto
      .createHmac('sha256', SHOPIFY_TEST_SECRET)
      .update(stockPayloadString)
      .digest('base64');

    const resShopifyStock = await fetch(`${baseUrl}/api/webhooks/shopify/inventory-levels-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': stockHmac,
      },
      body: stockPayloadString,
    });
    assert.strictEqual(resShopifyStock.status, 200, 'Debe responder 200 para inventory-levels-update');
    const jsonShopifyStock = (await resShopifyStock.json()) as any;
    assert.strictEqual(jsonShopifyStock.success, true);
    assert.strictEqual(jsonShopifyStock.event, 'STOCK_UPDATED');
    console.log('  ✓ 2.1 Superado (200 devuelto y evento STOCK_UPDATED emitido).');

    // ==========================================
    // 2. TESTS DE WEBHOOKS HOLDED
    // ==========================================
    console.log('\n[3] Probando Holded Webhook: /api/webhooks/holded/documents-create');

    const sampleDocPayload = {
      id: 'doc_holded_12345',
      docNumber: 'F2026-001',
      contact: 'contact_holded_987',
      total: 1250.5,
    };

    // 2.1 Rechazo sin token ni cabecera secreta (HTTP 401)
    console.log('  -> 3.1 Solicitud sin token de Holded (debe responder 401)...');
    const resHoldedNoToken = await fetch(`${baseUrl}/api/webhooks/holded/documents-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleDocPayload),
    });
    assert.strictEqual(resHoldedNoToken.status, 401, 'Debe devolver 401 sin credencial de Holded');
    console.log('  ✓ 3.1 Superado (401 devuelto sin token de Holded).');

    // 2.2 Rechazo con token incorrecto (HTTP 401)
    console.log('  -> 3.2 Solicitud con token incorrecto en cabecera (debe responder 401)...');
    const resHoldedBadToken = await fetch(`${baseUrl}/api/webhooks/holded/documents-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-holded-secret': 'invalid_holded_secret_123',
      },
      body: JSON.stringify(sampleDocPayload),
    });
    assert.strictEqual(resHoldedBadToken.status, 401, 'Debe devolver 401 con token incorrecto');
    console.log('  ✓ 3.2 Superado (401 devuelto con token no válido).');

    // 2.3 Aceptación con cabecera x-holded-secret válida (HTTP 200)
    console.log('  -> 3.3 Solicitud con cabecera x-holded-secret válida (debe responder 200)...');
    const resHoldedValidHeader = await fetch(`${baseUrl}/api/webhooks/holded/documents-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-holded-secret': HOLDED_TEST_SECRET,
      },
      body: JSON.stringify(sampleDocPayload),
    });
    assert.strictEqual(resHoldedValidHeader.status, 200, 'Debe responder 200 con x-holded-secret válido');
    const jsonHoldedValid = (await resHoldedValidHeader.json()) as any;
    assert.strictEqual(jsonHoldedValid.success, true);
    assert.strictEqual(jsonHoldedValid.event, 'INVOICE_CREATED');
    assert.ok(jsonHoldedValid.eventId);
    console.log('  ✓ 3.3 Superado (200 devuelto y evento INVOICE_CREATED emitido).');

    // 2.4 Aceptación con query token válida (?token=...) (HTTP 200)
    console.log('\n[4] Probando Holded Webhook: /api/webhooks/holded/contacts-create con ?token=');
    const sampleContactPayload = {
      id: 'contact_h_555',
      name: 'Empresa Cliente S.L.',
      email: 'facturas@empresacliente.es',
      code: 'B12345678',
    };

    const resHoldedQueryToken = await fetch(
      `${baseUrl}/api/webhooks/holded/contacts-create?token=${encodeURIComponent(HOLDED_TEST_SECRET)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleContactPayload),
      }
    );
    assert.strictEqual(resHoldedQueryToken.status, 200, 'Debe responder 200 con query token válida');
    const jsonHoldedContact = (await resHoldedQueryToken.json()) as any;
    assert.strictEqual(jsonHoldedContact.success, true);
    assert.strictEqual(jsonHoldedContact.event, 'CUSTOMER_CREATED');
    assert.ok(jsonHoldedContact.eventId);
    console.log('  ✓ 4.1 Superado (200 devuelto y evento CUSTOMER_CREATED emitido mediante ?token=).');

    // 2.5 Aceptación con prefijo alternativo /webhooks (HTTP 200)
    console.log('\n[5] Probando prefijo alternativo /webhooks/shopify/orders-create');
    const resPrefixAlt = await fetch(`${baseUrl}/webhooks/shopify/orders-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': validHmacBase64,
      },
      body: orderPayloadString,
    });
    assert.strictEqual(resPrefixAlt.status, 200, 'Debe responder 200 también bajo prefijo /webhooks');
    console.log('  ✓ 5.1 Superado (Prefijo /webhooks verificado con éxito).');

    console.log('\n🎉 ¡Todos los tests de Webhooks de Shopify y Holded pasaron exitosamente!');
  } finally {
    server.close();
  }
}

runWebhooksTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en test de webhooks:', err);
    process.exit(1);
  });
