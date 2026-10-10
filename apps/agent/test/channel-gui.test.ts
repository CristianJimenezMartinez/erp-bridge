import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

console.log('--- Running Channel GUI & Router Tests (Holded & Shopify) ---');

async function runChannelGuiTests() {
  const testDir = path.join(os.tmpdir(), `bentian-channel-gui-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  process.env.BENTIAN_DATA_DIR = testDir;
  process.env.BENTIAN_CONFIG_PATH = path.join(testDir, 'agent-config.json');

  const agent = new LocalAgent();
  const server = new LocalGuiServer(agent, 39888);
  const originalFetch = globalThis.fetch;

  try {
    const { port, url } = await server.start();
    console.log(`✓ LocalGuiServer iniciado en ${url} (port ${port})`);

    // 1. Verificar bloqueo por licencia inactiva
    console.log('1. Probando bloqueo por licencia inactiva en /api/local/channel/test-holded...');
    agent.getLicenseStatus = () => ({ status: 'UNLICENSED', valid: false } as any);

    const resBlocked = await originalFetch(`${url}/api/local/channel/test-holded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'test_holded_api_key' }),
    });

    assert.strictEqual(resBlocked.status, 200, 'Debe responder 200 OK con payload informativo');
    const jsonBlocked = (await resBlocked.json()) as any;
    assert.strictEqual(jsonBlocked.success, false);
    assert.strictEqual(jsonBlocked.latencyMs, 0);
    assert(jsonBlocked.message.includes('Acción bloqueada'), 'Debe indicar que la acción está bloqueada por licencia');
    console.log('  ✓ Bloqueo por licencia inactiva verificado correctamente.');

    // 2. Con licencia activa: Validar API Key vacía
    console.log('2. Probando validación con API Key vacía...');
    agent.getLicenseStatus = () => ({ status: 'VALID', valid: true, plan: 'enterprise' } as any);

    const resEmptyKey = await originalFetch(`${url}/api/local/channel/test-holded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });

    assert.strictEqual(resEmptyKey.status, 200);
    const jsonEmpty = (await resEmptyKey.json()) as any;
    assert.strictEqual(jsonEmpty.success, false);
    assert(jsonEmpty.message.toLowerCase().includes('api key'), 'Debe advertir sobre API Key vacía');
    assert.strictEqual(typeof jsonEmpty.durationMs, 'number');
    console.log('  ✓ Validación de API Key requerida verificada.');

    // 3. Conexión exitosa simulada con Holded
    console.log('3. Probando conexión exitosa simulada con Holded Invoicing API...');
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (urlStr.includes('api.holded.com/api/v1/invoicing/v1/contacts')) {
        return new Response(JSON.stringify([{ id: 'contact-1', name: 'Cliente Test' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };

    const resSuccess = await originalFetch(`${url}/api/local/channel/test-holded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'holded_valid_live_key_123',
        defaultWarehouseId: 'warehouse-principal',
      }),
    });

    assert.strictEqual(resSuccess.status, 200);
    const jsonSuccess = (await resSuccess.json()) as any;
    assert.strictEqual(jsonSuccess.success, true);
    assert.strictEqual(typeof jsonSuccess.latencyMs, 'number');
    assert.strictEqual(typeof jsonSuccess.durationMs, 'number');
    assert(jsonSuccess.message.includes('correctamente') || jsonSuccess.message.includes('Holded'));
    console.log(`  ✓ Conexión exitosa verificada (latencia: ${jsonSuccess.latencyMs} ms, duración: ${jsonSuccess.durationMs} ms).`);

    // 4. Probar alias /api/local/test-holded
    console.log('4. Probando alias de ruta /api/local/test-holded...');
    const resAlias = await originalFetch(`${url}/api/local/test-holded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'holded_valid_live_key_123',
      }),
    });

    assert.strictEqual(resAlias.status, 200);
    const jsonAlias = (await resAlias.json()) as any;
    assert.strictEqual(jsonAlias.success, true);
    console.log('  ✓ Alias /api/local/test-holded responde correctamente.');

    // 5. Conexión fallida simulada (401 Unauthorized de Holded)
    console.log('5. Probando error 401 Unauthorized simulado de Holded...');
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (urlStr.includes('api.holded.com/api/v1/invoicing/v1/contacts')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };

    const resUnauthorized = await originalFetch(`${url}/api/local/channel/test-holded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'invalid_key_401' }),
    });

    assert.strictEqual(resUnauthorized.status, 200);
    const jsonUnauth = (await resUnauthorized.json()) as any;
    assert.strictEqual(jsonUnauth.success, false);
    assert.strictEqual(typeof jsonUnauth.durationMs, 'number');
    console.log('  ✓ Fallo de autenticación en Holded manejado con éxito.');

  } finally {
    globalThis.fetch = originalFetch;
    await server.stop();
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
    console.log('✓ Servidor detenido y limpieza de entorno completada.');
  }

  console.log('\n--- ALL CHANNEL GUI TESTS PASSED SUCCESSFULLY! ---');
}

runChannelGuiTests().catch((err) => {
  console.error('❌ Error en channel-gui.test.ts:', err);
  process.exit(1);
});
