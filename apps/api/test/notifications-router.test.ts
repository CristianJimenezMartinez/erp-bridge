import assert from 'assert';
import express from 'express';
import http from 'http';
import { notificationsRouter } from '../src/routes/notifications.router';

async function testNotificationsRouter() {
  console.log('🧪 Iniciando prueba automatizada de NotificationsRouter (Central Relay)...');

  const app = express();
  app.use(express.json());
  app.use('/api/v1', notificationsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Caso error: Falta campo 'to'
    console.log('  -> Test 1: Solicitud sin destinatario "to" (debe responder 400)...');
    const res1 = await fetch(`${baseUrl}/notifications/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Nuevo Pedido Web',
        html: '<p>Detalles del pedido</p>',
      }),
    });
    assert.strictEqual(res1.status, 400, 'Debe devolver 400 si falta "to"');
    const json1 = (await res1.json()) as any;
    assert.strictEqual(json1.success, false);
    console.log('  ✓ Test 1 superado (400 por falta de campos obligatorios).');

    // 2. Caso error: Falta 'subject'
    console.log('  -> Test 2: Solicitud sin "subject" (debe responder 400)...');
    const res2 = await fetch(`${baseUrl}/notifications/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'pedidos@empresa.com',
        html: '<p>Detalles</p>',
      }),
    });
    assert.strictEqual(res2.status, 400, 'Debe devolver 400 si falta "subject"');
    console.log('  ✓ Test 2 superado.');

    // 3. Caso error: Faltan tanto 'html' como 'text'
    console.log('  -> Test 3: Solicitud sin "html" ni "text" (debe responder 400)...');
    const res3 = await fetch(`${baseUrl}/notifications/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'pedidos@empresa.com',
        subject: 'Nuevo Pedido Web #1024',
      }),
    });
    assert.strictEqual(res3.status, 400, 'Debe devolver 400 si faltan html y text');
    console.log('  ✓ Test 3 superado.');

    // 4. Caso éxito: Payload completo con html y licenseKey en header
    console.log('  -> Test 4: Envío exitoso con payload completo...');
    const res4 = await fetch(`${baseUrl}/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': 'EB-TEST-NOTIF-0001',
      },
      body: JSON.stringify({
        to: 'pedidos@empresa.com',
        subject: 'Nuevo Pedido Factusol #1024 (Serie W)',
        html: '<h1>Pedido recibido</h1><p>Cliente: Test Enterprise SL</p>',
        text: 'Pedido recibido. Cliente: Test Enterprise SL',
      }),
    });
    assert.strictEqual(res4.status, 200, 'Debe devolver 200 al despachar la notificación');
    const json4 = (await res4.json()) as any;
    assert.strictEqual(json4.success, true);
    assert.ok(json4.provider, 'Debe retornar el proveedor utilizado');
    console.log(`  ✓ Test 4 superado (200 OK despachado vía ${json4.provider}).`);

    // 5. Caso éxito: Envío solo con text (fallback automático a html)
    console.log('  -> Test 5: Envío con solo texto plano...');
    const res5 = await fetch(`${baseUrl}/notifications/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'gerencia@empresa.com',
        subject: 'Aviso urgente de pedido',
        text: 'Resumen del pedido recibido en Factusol.',
      }),
    });
    assert.strictEqual(res5.status, 200, 'Debe devolver 200 con solo text');
    const json5 = (await res5.json()) as any;
    assert.strictEqual(json5.success, true);
    console.log('  ✓ Test 5 superado (200 OK con texto plano).');

    console.log('======================================================================');
    console.log('🎉 TODOS LOS TESTS DE NOTIFICATIONS ROUTER PASARON CON ÉXITO');
    console.log('======================================================================');
  } finally {
    server.close();
  }
}

testNotificationsRouter().catch((err) => {
  console.error('❌ Error en test de notifications router:', err);
  process.exit(1);
});
