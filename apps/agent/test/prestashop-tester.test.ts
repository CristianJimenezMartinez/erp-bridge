import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PrestashopTester } from '../src/channels/prestashop.tester';
import { ChannelTesterService, SECRET_MASK } from '../src/channels/channel-tester.service';
import { ChannelController } from '../src/gui/router/controllers/channel.controller';
import { ConfigManager } from '../src/config/config.manager';
import { ConfigApplierService } from '../src/lifecycle/config-applier.service';
import { EventBus } from '../src/diagnostics/event-bus';

async function runPrestashopTesterTests() {
  console.log('--- Probando PrestashopTester: Validación, Anti-SSRF, Mocks HTTP y ChannelTesterService ---');

  // ==========================================
  // BLOQUE 1: Validación básica de entradas y HTTPS
  // ==========================================
  console.log('1. Probando validación de parámetros de entrada...');
  {
    const r1 = await PrestashopTester.test({ storeUrl: '', apiKey: 'abc123' });
    assert.strictEqual(r1.success, false);
    assert(r1.message.includes('URL'), 'Debe advertir sobre URL vacía');
    assert.strictEqual(r1.checks?.serverOnline, false);

    const r2 = await PrestashopTester.test({ storeUrl: 'https://mitienda.com', apiKey: '' });
    assert.strictEqual(r2.success, false);
    assert(r2.message.includes('clave'), 'Debe advertir sobre clave vacía');
    assert.strictEqual(r2.checks?.permissionsOk, false);

    const r3 = await PrestashopTester.test({ storeUrl: 'http://mitienda.com', apiKey: 'abc123' });
    assert.strictEqual(r3.success, false);
    assert(r3.message.includes('HTTPS'), 'Debe exigir HTTPS para dominios remotos');
    assert.strictEqual(r3.checks?.sslValid, false);

    console.log('  ✓ Validación de parámetros y protocolo HTTPS verificada.');
  }

  // ==========================================
  // BLOQUE 2: Blindaje Anti-SSRF
  // ==========================================
  console.log('2. Probando blindaje Anti-SSRF contra hosts y rangos IP privados...');
  {
    const ssrfHosts = [
      'https://169.254.169.254/api',
      'https://10.0.0.1:8443',
      'https://192.168.1.100',
      'https://172.16.0.5',
      'https://172.31.255.254',
      'https://prestashop.internal',
      'https://intranet.local',
      'https://store.onion',
    ];

    for (const host of ssrfHosts) {
      const res = await PrestashopTester.test({ storeUrl: host, apiKey: 'dummy_key_123' });
      assert.strictEqual(res.success, false, `Anti-SSRF debe bloquear: ${host}`);
      assert(res.message.includes('Anti-SSRF'), `El mensaje debe indicar Anti-SSRF para ${host}`);
    }
    console.log(`  ✓ Blindaje Anti-SSRF verificado contra ${ssrfHosts.length} vectores de ataque.`);
  }

  // ==========================================
  // BLOQUE 3: Mocks HTTP - Éxito 200 con JSON y detección de versión
  // ==========================================
  console.log('3. Probando respuesta 200 OK con JSON y versión en cabecera PSWS-Version...');
  {
    const originalFetch = globalThis.fetch;
    let authHeaderReceived = '';

    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        const headers = (init?.headers as Record<string, string>) || {};
        authHeaderReceived = headers['Authorization'] || '';

        if (urlStr.includes('/api?output_format=JSON')) {
          const bodyPayload = JSON.stringify({
            api: {
              shops: [{ id: 1, name: 'Suministros Rubio PrestaShop' }],
            },
          });
          return {
            ok: true,
            status: 200,
            text: async () => bodyPayload,
            headers: new Headers({
              'psws-version': '8.1.2',
              'content-type': 'application/json',
            }),
          } as unknown as Response;
        }

        throw new Error(`Ruta inesperada en mock: ${urlStr}`);
      }) as typeof fetch;

      const res = await PrestashopTester.test({
        storeUrl: 'https://tienda-rubio.es',
        apiKey: '1234567890ABCDEF1234567890ABCDEF',
      });

      assert.strictEqual(res.success, true, 'Debe devolver éxito');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.version, '8.1.2');
      assert.strictEqual(res.storeName, 'Suministros Rubio PrestaShop');
      assert(res.latencyMs !== undefined && res.latencyMs >= 0);
      assert.strictEqual(res.checks?.serverOnline, true);
      assert.strictEqual(res.checks?.sslValid, true);
      assert.strictEqual(res.checks?.apiActive, true);
      assert.strictEqual(res.checks?.permissionsOk, true);

      // Verificar que envió autenticación HTTP Basic con la clave
      const expectedBasic = 'Basic ' + Buffer.from('1234567890ABCDEF1234567890ABCDEF:').toString('base64');
      assert.strictEqual(authHeaderReceived, expectedBasic, 'Debe enviar cabecera Authorization Basic');

      console.log('  ✓ Respuesta 200 OK con JSON, versión y nombre de tienda verificada.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ==========================================
  // BLOQUE 4: Mocks HTTP - Éxito 200 con XML y consulta secundaria /api/shops
  // ==========================================
  console.log('4. Probando respuesta 200 OK con XML y fallback de /api/shops...');
  {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = String(input);

        if (urlStr.includes('/api?output_format=JSON')) {
          // El servidor devuelve XML puro
          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <api>
    <products xlink:href="https://tienda-xml.com/api/products"/>
    <orders xlink:href="https://tienda-xml.com/api/orders"/>
  </api>
</prestashop>`;
          return {
            ok: true,
            status: 200,
            text: async () => xml,
            headers: new Headers({
              'psws-version': '1.7.8.9',
              'content-type': 'application/xml',
            }),
          } as unknown as Response;
        }

        if (urlStr.includes('/api/shops')) {
          const xmlShops = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <shops>
    <shop>
      <id>1</id>
      <name><![CDATA[Ferretería Industrial Rubio]]></name>
    </shop>
  </shops>
</prestashop>`;
          return {
            ok: true,
            status: 200,
            text: async () => xmlShops,
            headers: new Headers({
              'content-type': 'application/xml',
            }),
          } as unknown as Response;
        }

        throw new Error(`Ruta inesperada en mock: ${urlStr}`);
      }) as typeof fetch;

      // Probamos además pasando una URL que ya termina en /api/ para validar normalización
      const res = await PrestashopTester.test({
        storeUrl: 'https://tienda-xml.com/api/',
        apiKey: 'PS_KEY_VAL_123',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.version, '1.7.8.9');
      assert.strictEqual(res.storeName, 'Ferretería Industrial Rubio');
      assert.strictEqual(res.checks?.serverOnline, true);
      assert.strictEqual(res.checks?.permissionsOk, true);

      console.log('  ✓ Respuesta 200 OK con XML y detección de nombre mediante /api/shops validada.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ==========================================
  // BLOQUE 5: Errores HTTP (401, 403, 404, 500)
  // ==========================================
  console.log('5. Probando códigos de error HTTP (401, 403, 404, 500)...');
  {
    const originalFetch = globalThis.fetch;

    try {
      // 5.1 401 Unauthorized
      globalThis.fetch = (async () => ({
        ok: false,
        status: 401,
        text: async () => '401 Unauthorized',
        headers: new Headers(),
      })) as unknown as typeof fetch;

      const res401 = await PrestashopTester.test({
        storeUrl: 'https://tienda.com',
        apiKey: 'bad_key',
      });
      assert.strictEqual(res401.success, false);
      assert.strictEqual(res401.statusCode, 401);
      assert.strictEqual(res401.checks?.serverOnline, true);
      assert.strictEqual(res401.checks?.sslValid, true);
      assert.strictEqual(res401.checks?.apiActive, true);
      assert.strictEqual(res401.checks?.permissionsOk, false);
      assert(res401.message.includes('401'));

      // 5.2 403 Forbidden
      globalThis.fetch = (async () => ({
        ok: false,
        status: 403,
        text: async () => '403 Forbidden',
        headers: new Headers(),
      })) as unknown as typeof fetch;

      const res403 = await PrestashopTester.test({
        storeUrl: 'https://tienda.com',
        apiKey: 'forbidden_key',
      });
      assert.strictEqual(res403.success, false);
      assert.strictEqual(res403.statusCode, 403);
      assert.strictEqual(res403.checks?.serverOnline, true);
      assert.strictEqual(res403.checks?.permissionsOk, false);
      assert(res403.message.includes('403'));

      // 5.3 404 Not Found
      globalThis.fetch = (async () => ({
        ok: false,
        status: 404,
        text: async () => '404 Not Found',
        headers: new Headers(),
      })) as unknown as typeof fetch;

      const res404 = await PrestashopTester.test({
        storeUrl: 'https://tienda.com',
        apiKey: 'valid_key',
      });
      assert.strictEqual(res404.success, false);
      assert.strictEqual(res404.statusCode, 404);
      assert.strictEqual(res404.checks?.serverOnline, true);
      assert.strictEqual(res404.checks?.apiActive, false);
      assert.strictEqual(res404.checks?.permissionsOk, false);

      // 5.4 500 Server Error
      globalThis.fetch = (async () => ({
        ok: false,
        status: 500,
        text: async () => '500 Internal Server Error',
        headers: new Headers(),
      })) as unknown as typeof fetch;

      const res500 = await PrestashopTester.test({
        storeUrl: 'https://tienda.com',
        apiKey: 'valid_key',
      });
      assert.strictEqual(res500.success, false);
      assert.strictEqual(res500.statusCode, 500);
      assert.strictEqual(res500.checks?.serverOnline, true);
      assert.strictEqual(res500.checks?.apiActive, false);

      console.log('  ✓ Códigos de error HTTP 401, 403, 404 y 500 manejados correctamente.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ==========================================
  // BLOQUE 6: Error de red y timeout
  // ==========================================
  console.log('6. Probando manejo de fallos de red...');
  {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async () => {
        throw new Error('getaddrinfo ENOTFOUND tienda-inexistente.com');
      }) as unknown as typeof fetch;

      const resNet = await PrestashopTester.test({
        storeUrl: 'https://tienda-inexistente.com',
        apiKey: 'key_123',
      });

      assert.strictEqual(resNet.success, false);
      assert.strictEqual(resNet.checks?.serverOnline, false);
      assert.strictEqual(resNet.checks?.apiActive, false);
      assert(resNet.message.includes('Error de red'));

      console.log('  ✓ Fallos de red capturados y reportados limpiamente.');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ==========================================
  // BLOQUE 7: Delegación en ChannelTesterService y Desenmascaramiento
  // ==========================================
  console.log('7. Probando ChannelTesterService y resolución de clave enmascarada...');
  {
    const originalFetch = globalThis.fetch;

    try {
      let keySent = '';
      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = (init?.headers as Record<string, string>) || {};
        const auth = headers['Authorization'] || '';
        keySent = Buffer.from(auth.replace('Basic ', ''), 'base64').toString().replace(':', '');
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ api: { shops: [{ id: 1, name: 'Shop' }] } }),
          headers: new Headers({ 'psws-version': '8.1.0' }),
        } as unknown as Response;
      }) as typeof fetch;

      // Mock ConfigManager
      const mockConfigManager = {
        get: () => ({
          prestashop: {
            apiKey: 'STORED_SECRET_KEY_999',
            storeUrl: 'https://mitienda.com',
          },
        }),
      } as any;

      const service = new ChannelTesterService(mockConfigManager);

      // Si se pasa máscara, debe recuperar la clave del config
      const resMasked = await service.testPrestashopConnection({
        storeUrl: 'https://mitienda.com',
        apiKey: SECRET_MASK,
      });

      assert.strictEqual(resMasked.success, true);
      assert.strictEqual(keySent, 'STORED_SECRET_KEY_999', 'Debe haber usado la clave persistida');

      // Si se pasa una clave nueva, debe usar la nueva
      const resNew = await service.testPrestashopConnection({
        storeUrl: 'https://mitienda.com',
        apiKey: 'NEW_KEY_777',
      });

      assert.strictEqual(resNew.success, true);
      assert.strictEqual(keySent, 'NEW_KEY_777', 'Debe haber usado la clave nueva');

      console.log('  ✓ ChannelTesterService probado con éxito (desenmascaramiento y delegación).');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // ==========================================
  // BLOQUE 8: ChannelController.testPrestashop RouteHandler
  // ==========================================
  console.log('8. Probando ChannelController.testPrestashop RouteHandler (licencia y ejecución)...');
  {
    // 8.1 Licencia inactiva
    const mockAgentBlocked = {
      getLicenseStatus: () => ({ status: 'EXPIRED', valid: false }),
      testPrestashopConnection: async () => ({ success: true, message: 'OK' }),
    } as any;

    const handlerBlocked = ChannelController.testPrestashop(mockAgentBlocked);
    let statusCodeBlocked = 0;
    let headersBlocked: Record<string, string> = {};
    let responseDataBlocked = '';
    const resMockBlocked = {
      writeHead: (code: number, headers: Record<string, string>) => {
        statusCodeBlocked = code;
        headersBlocked = headers;
      },
      end: (data: string) => {
        responseDataBlocked = data;
      },
    } as any;

    await handlerBlocked({} as any, resMockBlocked, { body: { storeUrl: 'https://test.com', apiKey: 'k' } } as any);
    assert.strictEqual(statusCodeBlocked, 200);
    assert.strictEqual(headersBlocked['Content-Type'], 'application/json');
    const parsedBlocked = JSON.parse(responseDataBlocked);
    assert.strictEqual(parsedBlocked.success, false);
    assert(parsedBlocked.message.includes('Acción bloqueada'));

    // 8.2 Licencia válida
    const mockAgentValid = {
      getLicenseStatus: () => ({ status: 'VALID', valid: true }),
      testPrestashopConnection: async () => ({
        success: true,
        message: 'Conectado a PrestaShop',
        storeName: 'Mi Tienda PrestaShop',
        version: '8.1.3',
        latencyMs: 42,
        statusCode: 200,
        checks: { serverOnline: true, sslValid: true, apiActive: true, permissionsOk: true },
      }),
    } as any;

    const handlerValid = ChannelController.testPrestashop(mockAgentValid);
    let statusCodeValid = 0;
    let responseDataValid = '';
    const resMockValid = {
      writeHead: (code: number) => {
        statusCodeValid = code;
      },
      end: (data: string) => {
        responseDataValid = data;
      },
    } as any;

    await handlerValid({} as any, resMockValid, { body: { storeUrl: 'https://test.com', apiKey: 'k' } } as any);
    assert.strictEqual(statusCodeValid, 200);
    const parsedValid = JSON.parse(responseDataValid);
    assert.strictEqual(parsedValid.success, true);
    assert.strictEqual(parsedValid.storeName, 'Mi Tienda PrestaShop');
    assert.strictEqual(parsedValid.version, '8.1.3');
    assert.strictEqual(typeof parsedValid.durationMs, 'number');

    console.log('  ✓ ChannelController.testPrestashop validado con éxito.');
  }

  // ==========================================
  // BLOQUE 9: Hardened Anti-SSRF (IPv6, CGNAT, Credential Stripping)
  // ==========================================
  console.log('9. Probando blindaje avanzado Anti-SSRF (IPv6 bracketed, CGNAT, URL Credential Stripping)...');
  {
    const hardenedSsrfVectors = [
      'https://[::1]/api',
      'https://[fc00::1]/api',
      'https://[fe80::1]/api',
      'https://[::ffff:127.0.0.1]/api',
      'https://100.64.0.1/api',
      'https://100.100.1.1/api',
      'https://224.0.0.1/api',
    ];

    for (const vec of hardenedSsrfVectors) {
      const res = await PrestashopTester.test({ storeUrl: vec, apiKey: 'valid_key_123' });
      assert.strictEqual(res.success, false, `Vector ${vec} debe ser bloqueado por Anti-SSRF`);
      assert(res.message.includes('Anti-SSRF'), `Mensaje debe indicar Anti-SSRF para ${vec}`);
    }

    // Probar stripping de credenciales en URL
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';
    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        requestedUrl = String(input);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ api: { shops: [{ id: 1, name: 'Secure Shop' }] } }),
          headers: new Headers({ 'psws-version': '8.2.0' }),
        } as unknown as Response;
      }) as typeof fetch;

      const res = await PrestashopTester.test({
        storeUrl: 'https://admin:super_secret_password@mitienda-prestashop.es:8443',
        apiKey: 'key_1234567890',
      });
      assert.strictEqual(res.success, true);
      assert(!requestedUrl.includes('super_secret_password'), 'La URL solicitada NO debe contener la contraseña embebida');
      assert(!requestedUrl.includes('admin:'), 'La URL solicitada NO debe contener el usuario embebido');
    } finally {
      globalThis.fetch = originalFetch;
    }

    console.log('  ✓ Blindaje Anti-SSRF avanzado e higienización de credenciales validados.');
  }

  // ==========================================
  // BLOQUE 10: Persistencia de Configuración PrestaShop y Enmascaramiento
  // ==========================================
  console.log('10. Probando persistencia en disco de PrestaShop y protección anti-wiping de claves...');
  {
    const tmpDataDir = path.join(os.tmpdir(), `bentian-ps-config-test-${Date.now()}`);
    fs.mkdirSync(tmpDataDir, { recursive: true });
    process.env.BENTIAN_DATA_DIR = tmpDataDir;

    try {
      const configManager = new ConfigManager();
      const mockLicenseService = {
        activateLicense: async () => ({ success: true }),
      } as any;
      const mockFactusolService = {
        reconnect: async () => {},
      } as any;
      const mockSyncEngine = {
        startAutoSyncLoop: () => {},
      } as any;
      const eventBus = new EventBus();

      const configApplier = new ConfigApplierService(
        configManager,
        mockLicenseService,
        mockFactusolService,
        mockSyncEngine,
        eventBus
      );

      // Guardar por primera vez
      const saveRes = await configApplier.saveFullConfig({
        channelType: 'prestashop',
        prestashop: {
          storeUrl: 'https://tienda-oficial.com',
          apiKey: 'REAL_SECRET_PRESTASHOP_API_KEY_123',
        },
      }, () => false);

      assert.strictEqual(saveRes.success, true);

      // Verificar persistencia en memoria y en disco
      const savedCfg = configManager.get();
      assert.strictEqual(savedCfg.channelType, 'prestashop');
      assert.strictEqual(savedCfg.prestashop?.storeUrl, 'https://tienda-oficial.com');
      assert.strictEqual(savedCfg.prestashop?.apiKey, 'REAL_SECRET_PRESTASHOP_API_KEY_123');

      const diskContent = JSON.parse(fs.readFileSync(path.join(tmpDataDir, 'agent-config.json'), 'utf8'));
      assert.ok(
        diskContent.prestashop?.apiKey === 'REAL_SECRET_PRESTASHOP_API_KEY_123' ||
        String(diskContent.prestashop?.apiKey).startsWith('enc:v1:'),
        'La clave en disco debe guardarse (cifrada con enc:v1 o en texto seguro)'
      );

      // Re-guardar con clave enmascarada (********) no debe pisar la clave real
      const reSaveRes = await configApplier.saveFullConfig({
        prestashop: {
          storeUrl: 'https://tienda-oficial.com/updated',
          apiKey: SECRET_MASK,
        },
      }, () => false);

      assert.strictEqual(reSaveRes.success, true);
      const reSavedCfg = configManager.get();
      assert.strictEqual(reSavedCfg.prestashop?.storeUrl, 'https://tienda-oficial.com/updated');
      assert.strictEqual(reSavedCfg.prestashop?.apiKey, 'REAL_SECRET_PRESTASHOP_API_KEY_123', 'La clave real debe preservarse');

      console.log('  ✓ Persistencia de PrestaShop y protección de secretos validadas con éxito.');
    } finally {
      delete process.env.BENTIAN_DATA_DIR;
      try {
        fs.rmSync(tmpDataDir, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log('\n✅ TODOS LOS TESTS DE PRESTASHOP TESTER PASARON SATISFACTORIAMENTE (10/10)');
}

runPrestashopTesterTests().catch((err) => {
  console.error('❌ Error ejecutando tests de PrestashopTester:', err);
  process.exit(1);
});
