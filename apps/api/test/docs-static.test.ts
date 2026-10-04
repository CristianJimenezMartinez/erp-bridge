import assert from 'assert';
import http from 'http';
import { bootstrapApp } from '../src/server';
import { SyncScheduler } from '@erp-bridge/core';

async function run() {
  console.log('--- Running Docs Static Route & 301 Redirect E2E Tests ---');

  const app = await bootstrapApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Matriz de redirecciones 301 permanentes para URLs legacy auditadas por Manus
    const legacyRedirectCases: Array<{ source: string; target: string }> = [
      // Guía Antivirus & SmartScreen
      { source: '/docs/windows-antivirus-smartscreen-guide.html', target: '/docs/seguridad/antivirus-edr-smartscreen/' },
      { source: '/docs/windows-antivirus-smartscreen-guide', target: '/docs/seguridad/antivirus-edr-smartscreen/' },
      { source: '/docs/windows-antivirus-smartscreen-guide/', target: '/docs/seguridad/antivirus-edr-smartscreen/' },
      // Error .laccdb
      { source: '/docs/error-base-datos-bloqueada-factusol-laccdb.html', target: '/docs/troubleshooting/error-3045-base-datos-bloqueada/' },
      { source: '/docs/error-base-datos-bloqueada-factusol-laccdb', target: '/docs/troubleshooting/error-3045-base-datos-bloqueada/' },
      // Matriz Compatibilidad Factusol
      { source: '/docs/matriz-compatibilidad-factusol', target: '/docs/factusol/matriz-compatibilidad/' },
      { source: '/docs/matriz-compatibilidad-factusol/', target: '/docs/factusol/matriz-compatibilidad/' },
      { source: '/docs/matriz-compatibilidad-factusol.html', target: '/docs/factusol/matriz-compatibilidad/' },
      // Protocolo Beta & Precios Fundador
      { source: '/docs/protocolo-beta-precios-fundador.html', target: '/docs/primeros-pasos/activacion-de-licencias/' },
      { source: '/docs/protocolo-beta-precios-fundador', target: '/docs/primeros-pasos/activacion-de-licencias/' },
      // Error Microsoft ACE OLEDB
      { source: '/docs/error-proveedor-oledb-factusol-microsoft-ace.html', target: '/docs/troubleshooting/error-oledb-no-registrado/' },
      { source: '/docs/error-proveedor-oledb-factusol-microsoft-ace', target: '/docs/troubleshooting/error-oledb-no-registrado/' },
      // Sincronizar Pedidos WooCommerce
      { source: '/docs/sincronizar-pedidos-woocommerce-factusol.html', target: '/docs/canales/woocommerce/' },
      { source: '/docs/sincronizar-pedidos-woocommerce-factusol', target: '/docs/canales/woocommerce/' },
      // Evitar Roturas de Stock DISSTO
      { source: '/docs/evitar-roturas-stock-factusol-dissto.html', target: '/docs/factusol/calculo-stock-disponible/' },
      { source: '/docs/evitar-roturas-stock-factusol-dissto', target: '/docs/factusol/calculo-stock-disponible/' },
    ];

    for (const testCase of legacyRedirectCases) {
      // A) Comprobar código 301 y cabecera Location exacta (redirect manual)
      const resManual = await fetch(`${baseUrl}${testCase.source}`, { redirect: 'manual' });
      assert.strictEqual(
        resManual.status,
        301,
        `Ruta legacy ${testCase.source} debe devolver 301 Moved Permanently, obtenido: ${resManual.status}`
      );
      assert.strictEqual(
        resManual.headers.get('location'),
        testCase.target,
        `Ruta legacy ${testCase.source} debe redirigir exactamente a ${testCase.target}`
      );

      // B) Comprobar resolución final 200 OK siguiendo la redirección
      const resFollowed = await fetch(`${baseUrl}${testCase.source}`, { redirect: 'follow' });
      assert.strictEqual(
        resFollowed.status,
        200,
        `Ruta canónica de destino para ${testCase.source} debe resolver con 200 OK`
      );
      const text = await resFollowed.text();
      assert.ok(
        text.includes('<html'),
        `Ruta canónica de destino para ${testCase.source} debe contener documento HTML válido`
      );

      console.log(`✓ 301 Redirect verificado: ${testCase.source} -> ${testCase.target} (200 OK final)`);
    }

    // 2. Comprobar acceso a lectura de Markdown crudo (.md)
    const mdRes = await fetch(`${baseUrl}/docs/windows-antivirus-smartscreen-guide.md`);
    assert.strictEqual(mdRes.status, 200, 'Endpoint directo .md debe devolver 200 OK');
    const mdContentType = mdRes.headers.get('content-type') || '';
    assert.ok(
      mdContentType.includes('text/markdown'),
      `Content-Type de .md debe ser text/markdown, obtenido: ${mdContentType}`
    );
    const mdText = await mdRes.text();
    assert.ok(
      mdText.includes('Guía de Resolución de Windows Defender SmartScreen'),
      'Fichero markdown crudo debe contener título original de soporte'
    );
    console.log('✓ /docs/windows-antivirus-smartscreen-guide.md: 200 OK (Content-Type: text/markdown verificado)');

    // 3. Comprobar negociación de contenidos con Accept: text/markdown en la ruta sin extensión
    const acceptMdRes = await fetch(`${baseUrl}/docs/windows-antivirus-smartscreen-guide`, {
      headers: { Accept: 'text/markdown' },
    });
    assert.strictEqual(acceptMdRes.status, 200, 'Accept: text/markdown debe devolver markdown crudo con 200 OK');
    const acceptMdContentType = acceptMdRes.headers.get('content-type') || '';
    assert.ok(
      acceptMdContentType.includes('text/markdown'),
      `Content-Type con Accept text/markdown debe ser text/markdown, obtenido: ${acceptMdContentType}`
    );
    console.log('✓ /docs/windows-antivirus-smartscreen-guide (Accept: text/markdown): 200 OK');

    // 4. Comprobar Hub central de Documentación (/docs/)
    const docsIndexRes = await fetch(`${baseUrl}/docs/`);
    assert.strictEqual(docsIndexRes.status, 200, 'Hub de documentación /docs/ debe devolver 200 OK');
    const hubText = await docsIndexRes.text();
    assert.ok(
      hubText.includes('Documentación Técnica de Bentian ERP Bridge'),
      'Hub debe contener título oficial del centro de documentación'
    );
    console.log('✓ /docs/: 200 OK (Hub oficial verificado)');

    console.log('\n✅ Todos los tests de redirecciones 301 canónicas y documentación técnica pasaron exitosamente!');
  } finally {
    try {
      SyncScheduler.getInstance().stop();
    } catch {}
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
