import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ShopifyTester } from '../src/channels/shopify.tester';
import { LocalAgent } from '../src/agent';
import { LocalGuiServer } from '../src/gui/gui-server';

async function runShopifyChannelTests() {
  console.log('--- Probando Canal Shopify: Normalización, Anti-SSRF, Persistencia y Endpoint Local ---');

  // ==========================================
  // BLOQUE 1: Normalización de subdominio / URL
  // ==========================================
  console.log('1. Probando normalización de subdominios y URLs de Shopify...');
  {
    const r1 = ShopifyTester.normalizeShopUrl('mi-tienda');
    assert.strictEqual(r1.success, true);
    assert.strictEqual(r1.cleanSubdomain, 'mi-tienda');
    assert.strictEqual(r1.fullUrl, 'https://mi-tienda.myshopify.com');

    const r2 = ShopifyTester.normalizeShopUrl('mi-tienda.myshopify.com');
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r2.cleanSubdomain, 'mi-tienda');
    assert.strictEqual(r2.fullUrl, 'https://mi-tienda.myshopify.com');

    const r3 = ShopifyTester.normalizeShopUrl('https://mi-tienda.myshopify.com/');
    assert.strictEqual(r3.success, true);
    assert.strictEqual(r3.cleanSubdomain, 'mi-tienda');
    assert.strictEqual(r3.fullUrl, 'https://mi-tienda.myshopify.com');

    const r4 = ShopifyTester.normalizeShopUrl('https://mi-tienda.myshopify.com');
    assert.strictEqual(r4.success, true);
    assert.strictEqual(r4.cleanSubdomain, 'mi-tienda');

    const rEmpty = ShopifyTester.normalizeShopUrl('');
    assert.strictEqual(rEmpty.success, false);

    console.log('  ✓ Normalización de subdominios validada correctamente.');
  }

  // ==========================================
  // BLOQUE 2: Protección Anti-SSRF en Shopify
  // ==========================================
  console.log('2. Probando blindaje Anti-SSRF (IPs privadas, metadatos 169.254, localhost)...');
  {
    const ssrfCases = [
      '169.254.169.254',
      'http://169.254.169.254',
      'http://169.254.169.254/latest/meta-data',
      'localhost',
      'http://localhost:3000',
      '127.0.0.1',
      'http://127.0.0.1:8080',
      'http://10.0.0.1',
      'http://192.168.1.1',
      'http://172.20.0.1',
      'metadata.google.internal',
      'internal-host.local',
      'attacker.onion',
      '../evil/path',
      'shop name with spaces',
      'shop!@#$%',
    ];

    for (const evilHost of ssrfCases) {
      const res = ShopifyTester.normalizeShopUrl(evilHost);
      assert.strictEqual(res.success, false, `Anti-SSRF debe bloquear: ${evilHost}`);
      const testRes = await ShopifyTester.test({
        shopSubdomain: evilHost,
        accessToken: 'shpat_test_12345',
      });
      assert.strictEqual(testRes.success, false, `ShopifyTester.test debe rechazar: ${evilHost}`);
    }
    console.log(`  ✓ Blindaje Anti-SSRF verificado contra ${ssrfCases.length} vectores de ataque.`);
  }

  // ==========================================
  // BLOQUE 3: Tester GraphQL con Mock de Fetch
  // ==========================================
  console.log('3. Probando ShopifyTester.test() contra respuestas GraphQL simuladas...');
  {
    const originalFetch = globalThis.fetch;

    try {
      // 3.1 Éxito con ubicaciones
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        assert(urlStr.includes('admin/api/'), 'Debe apuntar a la Admin API');
        assert(urlStr.endsWith('/graphql.json'), 'Debe apuntar al endpoint graphql.json');
        assert.strictEqual(init?.method, 'POST');
        const headers = init?.headers as Record<string, string>;
        assert.strictEqual(headers['X-Shopify-Access-Token'], 'shpat_valid_token_123');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              shop: {
                id: 'gid://shopify/Shop/12345678',
                name: 'Suministros Rubio Oficial',
                myshopifyDomain: 'suministros-rubio.myshopify.com',
              },
              locations: {
                edges: [
                  { node: { id: 'gid://shopify/Location/11111', name: 'Almacén Principal' } },
                  { node: { id: 'gid://shopify/Location/22222', name: 'Tienda Madrid' } },
                ],
              },
            },
          }),
        } as unknown as Response;
      }) as typeof fetch;

      const okResult = await ShopifyTester.test({
        shopSubdomain: 'suministros-rubio',
        accessToken: 'shpat_valid_token_123',
      });
      assert.strictEqual(okResult.success, true);
      assert(okResult.message.includes('Suministros Rubio Oficial'));
      assert.strictEqual(okResult.locations?.length, 2);
      assert.strictEqual(okResult.locations?.[0]?.name, 'Almacén Principal');
      assert.strictEqual(okResult.locations?.[0]?.id, 'gid://shopify/Location/11111');
      assert.strictEqual(typeof okResult.durationMs, 'number');
      console.log('  ✓ Respuesta GraphQL exitosa procesada correctamente con 2 ubicaciones.');

      // 3.2 Error 401 Unauthorized
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 401,
        } as unknown as Response;
      }) as typeof fetch;

      const unauthorizedRes = await ShopifyTester.test({
        shopSubdomain: 'suministros-rubio',
        accessToken: 'shpat_bad_token',
      });
      assert.strictEqual(unauthorizedRes.success, false);
      assert(unauthorizedRes.message.includes('Error de autenticación'));
      console.log('  ✓ Error HTTP 401 de Shopify detectado y humanizado.');

      // 3.3 Error 404 Not Found
      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 404,
        } as unknown as Response;
      }) as typeof fetch;

      const notFoundRes = await ShopifyTester.test({
        shopSubdomain: 'tienda-inexistente',
        accessToken: 'shpat_token',
      });
      assert.strictEqual(notFoundRes.success, false);
      assert(notFoundRes.message.includes('no encontrada'));
      console.log('  ✓ Error HTTP 404 de tienda inexistente verificado.');

      // 3.4 Error en cuerpo GraphQL (errors array)
      globalThis.fetch = (async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            errors: [{ message: 'Access denied for shop field.' }],
          }),
        } as unknown as Response;
      }) as typeof fetch;

      const gqlErrRes = await ShopifyTester.test({
        shopSubdomain: 'suministros-rubio',
        accessToken: 'shpat_limited_token',
      });
      assert.strictEqual(gqlErrRes.success, false);
      assert(gqlErrRes.message.includes('Access denied'));
      console.log('  ✓ Errores de permisos en cuerpo GraphQL capturados.');

    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ====================================================
  // BLOQUE 4: Persistencia y Enmascaramiento de Secretos
  // ====================================================
  console.log('4. Probando persistencia de canal Shopify y enmascaramiento seguro (AGT-004)...');
  const tempDir = path.join(os.tmpdir(), `bentian-shopify-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  process.env.BENTIAN_DATA_DIR = tempDir;
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  let server: LocalGuiServer | null = null;
  try {
    const agent = new LocalAgent();

    // Guardar configuración completa con Shopify
    await agent.saveFullConfig({
      channelType: 'shopify',
      shopify: {
        shopSubdomain: 'rubio-industrial',
        accessToken: 'shpat_super_secret_access_token_999',
        locationId: 'gid://shopify/Location/5544332211',
      },
    });

    // 4.1 Verificar que en disco y en getConfig() el token real está intacto
    const rawSaved = JSON.parse(fs.readFileSync(path.join(tempDir, 'agent-config.json'), 'utf8'));
    assert.strictEqual(rawSaved.channelType, 'shopify');
    assert.strictEqual(rawSaved.shopify.shopSubdomain, 'rubio-industrial');
    assert.strictEqual(rawSaved.shopify.accessToken, 'shpat_super_secret_access_token_999');
    assert.strictEqual(rawSaved.shopify.locationId, 'gid://shopify/Location/5544332211');

    // 4.2 Verificar que getStatusDetails() enmascara el accessToken con SECRET_MASK (••••••••)
    const status = await agent.getStatusDetails();
    assert.strictEqual(status.channelType, 'shopify');
    assert.strictEqual(status.shopifySettings?.shopSubdomain, 'rubio-industrial');
    assert.strictEqual(status.shopifySettings?.accessToken, '••••••••', 'El accessToken debe retornar enmascarado');
    assert.strictEqual(status.shopifySettings?.locationId, 'gid://shopify/Location/5544332211');
    console.log('  ✓ Token de Shopify enmascarado con éxito en telemetría de GUI.');

    // 4.3 Simular guardado desde la GUI enviando el valor enmascarado
    await agent.saveFullConfig({
      shopify: {
        shopSubdomain: 'rubio-industrial',
        accessToken: '••••••••',
        locationId: 'gid://shopify/Location/5544332211',
      },
    });

    const configAfterMaskedSave = agent.getConfig();
    assert.strictEqual(
      configAfterMaskedSave.shopify?.accessToken,
      'shpat_super_secret_access_token_999',
      'El token real no debe sobrescribirse al recibir la máscara'
    );
    console.log('  ✓ Preservación anti-wiping de credenciales enmascaradas verificada.');

    // 4.4 Simular reinicio del agente y verificar hidratación
    console.log('  Probando hidratación de configuración de Shopify tras reinicio...');
    const restartedAgent = new LocalAgent();
    assert.strictEqual(restartedAgent.getConfig().shopify?.shopSubdomain, 'rubio-industrial');
    assert.strictEqual(restartedAgent.getConfig().shopify?.accessToken, 'shpat_super_secret_access_token_999');
    console.log('  ✓ Hidratación de canal Shopify tras reinicio verificada exitosamente.');

    // ==========================================
    // BLOQUE 5: Endpoint HTTP Local /api/local/test-shopify
    // ==========================================
    console.log('5. Probando endpoint HTTP POST /api/local/test-shopify en LocalGuiServer...');
    server = new LocalGuiServer(restartedAgent, 39888);
    const { url } = await server.start();

    // Mock fetch durante el test de conexión HTTP
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes('/admin/api/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              shop: { id: 'gid://shopify/Shop/1', name: 'Tienda Test Live', myshopifyDomain: 'tienda-test.myshopify.com' },
              locations: {
                edges: [{ node: { id: 'gid://shopify/Location/77', name: 'Almacén Central Test' } }],
              },
            },
          }),
        } as unknown as Response;
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      // 5.1 Caso Licencia Inactiva: Bloqueo de seguridad
      const httpResBlocked = await fetch(`${url}/api/local/test-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopSubdomain: 'tienda-test',
          accessToken: 'shpat_live_test_key',
        }),
      });
      assert.strictEqual(httpResBlocked.status, 200);
      const jsonBlocked = (await httpResBlocked.json()) as any;
      assert.strictEqual(jsonBlocked.success, false);
      assert(jsonBlocked.message.includes('Acción bloqueada'), 'Debe requerir licencia activa');
      console.log('  ✓ Bloqueo por falta de licencia validado en endpoint.');

      // 5.2 Caso Licencia Activa: Ejecución y respuesta GraphQL
      restartedAgent.getLicenseStatus = () => ({ status: 'VALID', valid: true, plan: 'enterprise' } as any);

      const httpRes = await fetch(`${url}/api/local/test-shopify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopSubdomain: 'tienda-test',
          accessToken: 'shpat_live_test_key',
        }),
      });

      assert.strictEqual(httpRes.status, 200, 'POST /api/local/test-shopify debe responder 200 OK');
      const jsonRes = (await httpRes.json()) as any;
      assert.strictEqual(jsonRes.success, true);
      assert(jsonRes.message.includes('Tienda Test Live'));
      assert.strictEqual(jsonRes.locations?.length, 1);
      assert.strictEqual(jsonRes.locations?.[0]?.name, 'Almacén Central Test');
      assert.strictEqual(typeof jsonRes.durationMs, 'number');
      console.log(`  ✓ Endpoint POST /api/local/test-shopify respondió 200 OK con éxito (${jsonRes.durationMs}ms).`);
    } finally {
      globalThis.fetch = originalFetch;
    }

  } finally {
    if (server) {
      await server.stop();
      console.log('  ✓ Servidor de pruebas detenido.');
    }
    delete process.env.BENTIAN_DATA_DIR;
    delete process.env.BENTIAN_CONFIG_PATH;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n======================================================');
  console.log('✅ TODOS LOS TESTS DEL CANAL SHOPIFY PASARON CON ÉXITO');
  console.log('======================================================\n');
}

runShopifyChannelTests().catch((err) => {
  console.error('❌ Error en test de Shopify Channel:', err);
  process.exit(1);
});
