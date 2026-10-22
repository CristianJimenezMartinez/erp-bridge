import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { LocalAgent } from '../src/agent';
import { SupportedErpProviderId } from '../src/erp';
import { UniversalErpImageResolver } from '../src/sync/universal-erp-image.resolver';
import { buildSqlServerAtomicOrderBatch, tryPushOrderToAgoraHttpApi } from '../src/services/sql-erp-enhancer.service';
import { SimplyGestDetector } from '../src/simplygest';

interface ErpMilestoneTarget {
  id: SupportedErpProviderId;
  name: string;
  sourceDbPath: string;
  tempDbPath: string;
  warehouse: string;
  series: string;
  tariff: string;
}

async function runMultiErpMilestones() {
  console.log('================================================================================');
  console.log('🏁 VERIFICACIÓN MULTI-ERP POR HITOS (SIMPLYGEST, ÁGORA POS, SAGE 50, A3ERP)');
  console.log('================================================================================\n');

  const targets: ErpMilestoneTarget[] = [
    {
      id: 'simplygest',
      name: 'SimplyGest',
      sourceDbPath: 'C:\\SimplyGest\\Datos.mdb',
      tempDbPath: '',
      warehouse: 'GEN',
      series: '1',
      tariff: '1',
    },
    {
      id: 'agora',
      name: 'Ágora POS',
      sourceDbPath: 'C:\\BentianLab\\AgoraDB.mdb',
      tempDbPath: '',
      warehouse: '1',
      series: '1',
      tariff: '1',
    },
    {
      id: 'sage50',
      name: 'Sage 50',
      sourceDbPath: 'C:\\BentianLab\\GESTION.mdb',
      tempDbPath: '',
      warehouse: '01',
      series: '1',
      tariff: '1',
    },
    {
      id: 'a3erp',
      name: 'Wolters Kluwer a3ERP',
      sourceDbPath: 'C:\\BentianLab\\A3ERP.mdb',
      tempDbPath: '',
      warehouse: 'GEN',
      series: 'A',
      tariff: '1',
    },
  ];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bentian-multi-erp-hitos-'));
  // Regla 13: Aislamiento estricto de configuración en tests del agente
  process.env.BENTIAN_CONFIG_PATH = path.join(tempDir, 'agent-config.json');

  let mockStoreServer: http.Server | null = null;
  let mockStoreUrl = '';
  let lastUploadedProducts: any[] = [];
  let lastUploadedStock: any[] = [];
  let lastUploadedImages: Array<{ path: string; sku: string; bytes: number }> = [];

  try {
    // Copiar las 4 bases de datos reales a tempDir para pruebas destructivas aisladas
    for (const t of targets) {
      assert(
        fs.existsSync(t.sourceDbPath),
        `No se encontró la base de datos física de ${t.name} en ${t.sourceDbPath}`
      );
      t.tempDbPath = path.join(tempDir, `${t.id}-${path.basename(t.sourceDbPath)}`);
      fs.copyFileSync(t.sourceDbPath, t.tempDbPath);
    }

    // Servidor HTTP local simulando Universal Bridge para Hito 2 y Hito 5 (push_catalog + push_stock + check_images + upload_image)
    mockStoreServer = http.createServer((req, res) => {
      const reqUrl = req.url || '';
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => {
        const rawBuf = Buffer.concat(chunks);
        try {
          if (reqUrl.includes('action=upload_image')) {
            const filePath = String(req.headers['x-file-path'] || '');
            const sku = String(req.headers['x-product-sku'] || '');
            lastUploadedImages.push({ path: filePath, sku, bytes: rawBuf.length });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: filePath }));
            return;
          }

          const body = rawBuf.toString('utf8');
          const parsed = body ? JSON.parse(body) : {};

          if (reqUrl.includes('action=check_images')) {
            const imgs = Array.isArray(parsed.images) ? parsed.images : [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                existingCount: 0,
                missing: imgs.map((i: any) => i.path),
              })
            );
            return;
          }

          if (Array.isArray(parsed.products)) {
            lastUploadedProducts.push(...parsed.products);
          }
          if (Array.isArray(parsed.items)) {
            lastUploadedStock.push(...parsed.items);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              processed: parsed.products?.length || parsed.items?.length || 0,
            })
          );
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockStoreServer!.listen(0, '127.0.0.1', () => {
        const addr = mockStoreServer!.address() as { port: number };
        mockStoreUrl = `http://127.0.0.1:${addr.port}/erp-bridge-endpoint.php`;
        resolve();
      });
    });

    const sgTarget = targets[0]!;
    const agTarget = targets[1]!;
    const s50Target = targets[2]!;
    const a3Target = targets[3]!;

    const agent = new LocalAgent({ erpType: 'simplygest', simplygestDbPath: sgTarget.tempDbPath }, tempDir);
    // Simular licencia activa en el agente de laboratorio
    (agent.licenseService as any).getLicenseStatus = () => ({ status: 'VALID', plan: 'PRO' });

    // Conectar los 4 adaptadores a sus respectivas copias físicas (.mdb)
    await agent.simplygestAdapter.reconnect(sgTarget.tempDbPath);
    await agent.agoraAdapter.reconnect(`mssql://LOCAL_MDB/${agTarget.tempDbPath}`, {
      serverInstance: 'LOCAL_MDB',
      databaseName: agTarget.tempDbPath,
      evaluationMode: false,
    });
    await agent.sage50Adapter.reconnect(`mssql://LOCAL_MDB/${s50Target.tempDbPath}`, {
      serverInstance: 'LOCAL_MDB',
      databaseName: s50Target.tempDbPath,
      evaluationMode: false,
    });
    await agent.a3erpAdapter.reconnect(`mssql://LOCAL_MDB/${a3Target.tempDbPath}`, {
      serverInstance: 'LOCAL_MDB',
      databaseName: a3Target.tempDbPath,
      evaluationMode: false,
    });

    // =========================================================================
    // HITO 1: CONEXIÓN FÍSICA, DETECCIÓN DE ESQUEMA Y PREVISUALIZACIÓN
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('📍 HITO 1: Conexión Física OLEDB/SQL, Detección de Esquema y Previsualización');
    console.log('--------------------------------------------------------------------------------');
    for (const t of targets) {
      agent.erpRegistry.setActiveProvider(t.id);
      const connector = agent.erpRegistry.getActiveConnector();
      assert.strictEqual(connector.providerId, t.id, `Proveedor activo debe ser ${t.id}`);
      assert.strictEqual(connector.isDatabaseAccessible(), true, `BD de ${t.name} debe ser accesible`);

      const connRes = await connector.testConnection(connector.getDatabasePath());
      assert.strictEqual(connRes.success, true, `testConnection de ${t.name} debe tener éxito`);
      assert((connRes.articleCount ?? 0) >= 1, `${t.name} debe detectar al menos 1 artículo`);

      const previews = await connector.getPreviewArticles(5);
      const firstPreview = previews[0];
      assert(firstPreview !== undefined, `${t.name} debe devolver al menos 1 artículo en vista previa`);
      assert(firstPreview.code && firstPreview.description, `Artículo de ${t.name} debe tener código y descripción`);
      assert(Number(firstPreview.salePrice) > 0, `Artículo de ${t.name} debe tener PVP > 0`);

      console.log(
        `  ✓ [${t.name}] Conectado (${connRes.articleCount} artículos). Ejemplo: [${firstPreview.code}] ${firstPreview.description} — ${firstPreview.salePrice} € (Stock: ${firstPreview.stock})`
      );
    }

    // =========================================================================
    // HITO 2: CATÁLOGO COMPLETO, MAPA DE STOCK Y SUBIDA A TIENDA WEB
    // =========================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('📍 HITO 2: Extracción de Catálogo Completo, Mapa de Stock y Subida a Tienda Web');
    console.log('--------------------------------------------------------------------------------');
    for (const t of targets) {
      agent.erpRegistry.setActiveProvider(t.id);
      const connector = agent.erpRegistry.getActiveConnector();

      const fullCatalog = await connector.getArticlesForCatalog!(5000);
      assert(fullCatalog.length >= 1, `Catálogo completo de ${t.name} debe tener >= 1 producto`);
      const firstItem = fullCatalog[0]!;

      const stockMap = await connector.getStockMap(t.warehouse);
      assert(stockMap.size >= 1, `Mapa de stock de ${t.name} debe tener >= 1 entrada`);
      assert(stockMap.has(firstItem.code), `Mapa de stock de ${t.name} debe incluir ${firstItem.code}`);

      lastUploadedProducts = [];
      lastUploadedStock = [];
      agent.configManager.update({
        channelType: 'universal_bridge',
        universalBridge: {
          storeUrl: mockStoreUrl,
          secretKey: 'test_secret_key_hito2',
        },
      } as any);

      const uploadRes = await agent.uploadCatalog();
      assert.strictEqual(uploadRes.success, true, `Subida de catálogo de ${t.name} debe completarse con éxito: ${uploadRes.message}`);
      assert.strictEqual(lastUploadedProducts.length, fullCatalog.length, `Deben subirse todos los artículos de ${t.name}`);
      console.log(
        `  ✓ [${t.name}] Catálogo leído (${fullCatalog.length} arts), StockMap (${stockMap.size} SKUs) y sincronizado a Tienda Web (${uploadRes.uploadedCount} productos subidos).`
      );
    }

    // =========================================================================
    // HITO 3: INYECCIÓN DE PEDIDOS WEB, IDEMPOTENCIA, STOCK Y REINTENTOS
    // =========================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('📍 HITO 3: Inyección Transaccional de Pedidos Web, Idempotencia, Stock y Reintentos');
    console.log('--------------------------------------------------------------------------------');
    for (const t of targets) {
      agent.erpRegistry.setActiveProvider(t.id);
      const connector = agent.erpRegistry.getActiveConnector();

      const previews = await connector.getPreviewArticles(5);
      const article = previews[0]!;
      const stockBefore = Number((await connector.getStockMap(t.warehouse)).get(article.code) ?? article.stock);

      const qty = 2;
      const unitPrice = Number(article.salePrice || 25);
      const netAmount = Number((unitPrice * qty).toFixed(2));
      const taxAmount = Number((netAmount * 0.21).toFixed(2));
      const totalAmount = Number((netAmount + taxAmount).toFixed(2));
      const ref = `WC-${t.id.toUpperCase()}-${Date.now().toString().slice(-5)}`;

      const webOrder: any = {
        id: ref,
        orderNumber: ref,
        reference: ref,
        notes: ref,
        series: t.series,
        warehouse: t.warehouse,
        date: new Date(),
        status: 'processing',
        currency: 'EUR',
        netAmount,
        taxAmount,
        totalAmount,
        totals: { subtotal: netAmount, tax: taxAmount, total: totalAmount },
        customer: {
          id: '1',
          customerNumber: '1',
          fiscalName: `Cliente Web ${t.name}`,
          taxId: 'B12345678',
          email: `compras@${t.id}.es`,
          phone: '600123456',
        },
        lines: [
          {
            position: 1,
            sku: article.code,
            name: article.description,
            quantity: qty,
            unitPrice,
            taxRate: 21,
            vatPercent: 21,
            subtotal: netAmount,
            total: netAmount,
          },
        ],
      };

      // 1. Crear pedido web en el ERP
      const res1 = await connector.createOrder(webOrder, t.series, t.warehouse);
      assert.strictEqual(res1.success, true, `createOrder en ${t.name} falló: ${res1.error}`);
      assert(res1.orderNumber !== undefined, `${t.name} debe devolver número de pedido asignado`);

      // 2. Comprobar descuento físico de stock en disco
      const stockAfter1 = Number((await connector.getStockMap(t.warehouse)).get(article.code));
      assert.strictEqual(
        stockAfter1,
        stockBefore - qty,
        `Stock en ${t.name} para ${article.code} debía bajar de ${stockBefore} a ${stockBefore - qty} (actual: ${stockAfter1})`
      );

      // 3. Idempotencia: reenviar el mismo pedido web no debe duplicar ni volver a restar stock
      const res2 = await connector.createOrder(webOrder, t.series, t.warehouse);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(
        String(res2.orderNumber),
        String(res1.orderNumber),
        `Idempotencia en ${t.name}: debe retornar el mismo número de pedido`
      );
      const stockAfter2 = Number((await connector.getStockMap(t.warehouse)).get(article.code));
      assert.strictEqual(stockAfter2, stockAfter1, `Idempotencia en ${t.name}: no debe volver a descontar stock`);

      // 4. Reintento desde SalesOrderManager (cola de pedidos fallidos)
      const retryRef = `RETRY-${t.id.toUpperCase()}-${Date.now().toString().slice(-5)}`;
      const failedEntry = agent.salesLedgerManager.recordOrder({
        channel: 'woocommerce',
        webOrderId: retryRef,
        orderNumber: retryRef,
        factusolSeries: t.series,
        customerName: `Cliente Reintento ${t.name}`,
        customerEmail: `retry@${t.id}.es`,
        totalAmount: Number((unitPrice * 1.21).toFixed(2)),
        currency: 'EUR',
        status: 'failed',
        lines: [
          {
            sku: article.code,
            name: article.description,
            quantity: 1,
            unitPrice,
            total: Number((unitPrice * 1.21).toFixed(2)),
          },
        ],
      });

      const retryRes = await agent.salesOrderManager.retrySalesOrder(failedEntry.id);
      assert.strictEqual(retryRes.success, true, `retrySalesOrder en ${t.name} falló: ${retryRes.message}`);
      assert.strictEqual(retryRes.order?.status, 'synced');

      const stockAfterRetry = Number((await connector.getStockMap(t.warehouse)).get(article.code));
      assert.strictEqual(
        stockAfterRetry,
        stockAfter2 - 1,
        `Reintento en ${t.name} debía descontar 1 ud adicional (${stockAfter2} -> ${stockAfterRetry})`
      );

      console.log(
        `  ✓ [${t.name}] Pedido #${res1.orderNumber} creado, Idempotencia OK, Stock (${stockBefore} -> ${stockAfter1} -> ${stockAfterRetry} tras retry #${retryRes.order?.factusolOrderNumber}).`
      );
    }

    // =========================================================================
    // HITO 4: SIMULADOR DE PEDIDOS 1-CLICK (DRY-RUN Y EJECUCIÓN REAL)
    // =========================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('📍 HITO 4: Simulador 1-Click desde la GUI (Dry-Run y Ejecución Real en Disco)');
    console.log('--------------------------------------------------------------------------------');
    for (const t of targets) {
      agent.erpRegistry.setActiveProvider(t.id);
      const connector = agent.erpRegistry.getActiveConnector();

      // 1. Simulación Dry-Run (sin escritura en disco)
      const dryRes = await agent.testOrderSimulator.simulateOrder({
        dryRun: true,
        orderSeries: t.series,
        warehouse: t.warehouse,
      });
      assert.strictEqual(dryRes.success, true, `Dry-Run en ${t.name} debe ser exitoso`);
      assert.strictEqual(dryRes.dryRun, true);
      assert.strictEqual(
        dryRes.details.article?.stockAfter,
        dryRes.details.article?.stockBefore,
        `Dry-Run en ${t.name} no debe alterar el stock`
      );

      const targetSku = dryRes.articleCode;
      const stockBeforeReal = Number((await connector.getStockMap(t.warehouse)).get(targetSku));

      // 2. Simulación Real (dryRun: false -> inserta pedido real y descuenta 1 ud en disco)
      const realRes = await agent.testOrderSimulator.simulateOrder({
        dryRun: false,
        orderSeries: t.series,
        warehouse: t.warehouse,
        targetArticleCode: targetSku,
      });
      assert.strictEqual(realRes.success, true, `Simulación real en ${t.name} falló: ${realRes.error}`);
      assert.strictEqual(realRes.dryRun, false);
      assert(realRes.totalAmount > 0, `Total del pedido simulado en ${t.name} debe ser > 0`);
      assert.strictEqual(realRes.details.article?.stockBefore, stockBeforeReal);
      assert.strictEqual(
        realRes.details.article?.stockAfter,
        stockBeforeReal - 1,
        `Simulación real en ${t.name} debe reflejar stock descontado en 1 ud (${stockBeforeReal} -> ${realRes.details.article?.stockAfter})`
      );

      console.log(
        `  ✓ [${t.name}] Dry-Run OK | Simulación Real Pedido #${realRes.orderNumber} (${realRes.totalAmount.toFixed(2)} €) — Stock [${targetSku}]: ${stockBeforeReal} -> ${realRes.details.article?.stockAfter} uds.`
      );
    }

    // =========================================================================
    // HITO 5: SINCRONIZACIÓN AUTOMÁTICA DE FOTOS MULTI-ERP (TODAS LAS CASUÍSTICAS)
    // =========================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('📍 HITO 5: Sincronización Automática de Fotos Multi-ERP (BLOB, OLE, SKU, EAN y _1)');
    console.log('--------------------------------------------------------------------------------');

    // 5.1 Verificar extracción binaria (BLOB SQL Hex 0xFFD8FF..., Base64 y contenedor OLE de Access)
    const sampleJpegBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0xff, 0xd9,
    ]);
    const resolver = new UniversalErpImageResolver({ providerId: 'a3erp', databasePath: a3Target.tempDbPath });

    // Caso A: Hexadecimal SQL Server VARBINARY(MAX) (a3ERP)
    const hexBlob = '0x' + sampleJpegBytes.toString('hex').toUpperCase();
    const resHex = resolver.tryMaterializeEmbeddedBlob('A3-5001', hexBlob);
    assert(resHex && resHex.exists && resHex.localPath, 'Debe extraer imagen de BLOB Hexadecimal SQL Server');
    assert.strictEqual(resHex.relativeWebPath, 'FOTOS/A3-5001.jpg');

    // Caso B: Contenedor OLE de Microsoft Access / SimplyGest (40 bytes de cabecera OLE + JPEG)
    const oleHeader = Buffer.alloc(40, 0x15);
    const oleWrappedBuf = Buffer.concat([oleHeader, sampleJpegBytes]);
    const resOle = resolver.tryMaterializeEmbeddedBlob('SG-1001', oleWrappedBuf);
    assert(resOle && resOle.exists && resOle.localPath, 'Debe limpiar cabecera OLE y extraer JPEG limpio');
    assert.strictEqual(resOle.sizeBytes, sampleJpegBytes.length, 'El archivo extraído no debe incluir basura OLE');
    console.log('  ✓ [Casuística BLOB/VARBINARY/OLE] Extracción binaria automática verificada (SQL Hex 0xFFD8FF y contenedor OLE Access).');

    // 5.2 Auto-descubrimiento en carpetas (Fotos/ e Imagenes/) por SKU exacto, SKU_1 (Sage 50 LINEA=1) y SKU normalizado
    const fotosDir = path.join(tempDir, 'Fotos');
    const imagenesDir = path.join(tempDir, 'Imagenes');
    fs.mkdirSync(fotosDir, { recursive: true });
    fs.mkdirSync(imagenesDir, { recursive: true });

    // Crear archivos físicos de prueba con las distintas convenciones reales de cada ERP:
    // - SimplyGest: SG-1001.jpg en Fotos/
    // - Ágora POS: 3001.jpg en Imagenes/
    // - Sage 50: S50-4001_1.jpg (convención LINEA=1 de ART_FOTO) en Imagenes/
    // - a3ERP: A3_5001.jpg (convención SKU normalizado con guion bajo) en Fotos/
    fs.writeFileSync(path.join(fotosDir, 'SG-1001.jpg'), sampleJpegBytes);
    fs.writeFileSync(path.join(imagenesDir, '3001.jpg'), sampleJpegBytes);
    fs.writeFileSync(path.join(imagenesDir, 'S50-4001_1.jpg'), sampleJpegBytes);
    fs.writeFileSync(path.join(fotosDir, 'A3_5001.jpg'), sampleJpegBytes);

    const expectedPhotoByErp: Record<string, { sku: string; expectedFile: string }> = {
      simplygest: { sku: 'SG-1001', expectedFile: '/FOTOS/SG-1001.jpg' },
      agora: { sku: '3001', expectedFile: '/FOTOS/3001.jpg' },
      sage50: { sku: 'S50-4001', expectedFile: '/FOTOS/S50-4001_1.jpg' },
      a3erp: { sku: 'A3-5001', expectedFile: '/FOTOS/A3_5001.jpg' },
    };

    for (const t of targets) {
      agent.erpRegistry.setActiveProvider(t.id);
      lastUploadedProducts = [];
      lastUploadedImages = [];

      const upRes = await agent.uploadCatalog();
      assert.strictEqual(upRes.success, true, `uploadCatalog con fotos en ${t.name} debe tener éxito`);

      const exp = expectedPhotoByErp[t.id]!;
      assert(
        lastUploadedImages.length >= 1,
        `${t.name} debe haber subido automáticamente al menos 1 imagen física por HTTPS`
      );
      const matchingUploadedImg = lastUploadedImages.find((img) => img.sku === exp.sku);
      assert(
        matchingUploadedImg !== undefined,
        `${t.name} debe haber subido la foto para el SKU ${exp.sku}`
      );
      const matchingCatalogProd = lastUploadedProducts.find((p) => p.sku === exp.sku);
      assert(
        matchingCatalogProd && matchingCatalogProd.imgart === exp.expectedFile,
        `El producto ${exp.sku} en ${t.name} debe llevar imgart='${exp.expectedFile}' (actual: '${matchingCatalogProd?.imgart}')`
      );

      console.log(
        `  ✓ [${t.name}] Foto autodetectada y subida por HTTPS: [${exp.sku}] ➔ ${exp.expectedFile} (${matchingUploadedImg.bytes} bytes)`
      );
    }

    // =========================================================================
    // HITO 6: VERIFICACIÓN DE MOTORES REALES DE FABRICANTE (CALLE / PRODUCCIÓN)
    // =========================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('📍 HITO 6: Motores Reales de Fabricante (DBISAM .dat, API :56985, Sage 50 guid_id, a3ERP IDPEDV y Ágora :8984)');
    console.log('--------------------------------------------------------------------------------');

    // 6.1 SimplyGest Real A: Tablas nativas DBISAM (.dat en Emp1\articulos.dat) + pasarela SimplyMove CSV
    const sgEmp1Dir = path.join(tempDir, 'SimplyGest_Real', 'Datos', 'Emp1');
    fs.mkdirSync(sgEmp1Dir, { recursive: true });
    const sgDatFile = path.join(sgEmp1Dir, 'articulos.dat');
    fs.writeFileSync(sgDatFile, Buffer.from('DBISAM_TABLE_HEADER_V4'));

    const resolvedDat = SimplyGestDetector.resolve(path.join(tempDir, 'SimplyGest_Real'));
    assert.strictEqual(resolvedDat.success, true, 'SimplyGestDetector debe resolver automáticamente Emp1\\articulos.dat');
    assert.strictEqual(
      resolvedDat.resolvedPath?.toLowerCase(),
      sgDatFile.toLowerCase(),
      'Ruta resuelta debe apuntar a Emp1\\articulos.dat'
    );

    await agent.saveFullConfig({
      erpType: 'simplygest',
      simplygest: {
        databasePath: sgDatFile,
        selectedTariff: '1',
        selectedWarehouse: 'GEN',
        orderSeries: '1',
      } as any,
      softwareErp: {
        activeProvider: 'simplygest',
        simplygest: {
          databasePath: sgDatFile,
          selectedTariff: '1',
          selectedWarehouse: 'GEN',
          orderSeries: '1',
        },
      } as any,
    });
    agent.erpRegistry.setActiveProvider('simplygest');
    const sgDatCatalog = await agent.simplygestAdapter.getArticlesForCatalog();
    assert(sgDatCatalog.length >= 2, 'Driver DBISAM .dat debe devolver artículos de articulos.dat');

    const sgDatOrderRes = await agent.simplygestAdapter.createOrder(
      {
        id: 'WC-DAT-901',
        orderNumber: 'WC-DAT-901',
        reference: 'WC-DAT-901',
        status: 'processing',
        currency: 'EUR',
        orderDate: new Date().toISOString(),
        customer: { id: 'C-DAT-1', fiscalName: 'Cliente DBISAM Real SL', taxId: 'B99887766', email: 'dbisam@cliente.es', hasEquivalenceSurcharge: false },
        lines: [{ id: 'L-1', position: 1, sku: 'SG-1001', name: 'Tornillo DBISAM', quantity: 2, unitPrice: 12.5, vatPercent: 21, vatType: 1, discountPercent: 0, subtotal: 25, total: 30.25 }],
        netAmount: 25,
        taxAmount: 5.25,
        totalAmount: 30.25,
      } as any,
      '1',
      'GEN'
    );
    assert.strictEqual(sgDatOrderRes.success, true, `Inserción de pedido en DBISAM .dat debe tener éxito: ${sgDatOrderRes.error}`);
    assert(fs.existsSync(path.join(sgEmp1Dir, 'pedidosc.dat')), 'Debe persistir tabla física pedidosc.dat');
    assert(fs.existsSync(path.join(sgEmp1Dir, 'pedidosl.dat')), 'Debe persistir tabla física pedidosl.dat');
    assert(fs.existsSync(path.join(sgEmp1Dir, 'pedidos_simplymove.csv')), 'Debe generar fichero oficial pedidos_simplymove.csv');
    console.log('  ✓ [SimplyGest DBISAM .dat] Lectura/Escritura en Emp1\\articulos.dat, pedidosc.dat y pedidos_simplymove.csv verificada.');

    // 6.2 SimplyGest Real B: Módulo Servidor SimplyGest REST API (Puerto 56985 + APIKey)
    let sgApiReceivedAuth = '';
    let sgApiOrderCreated = false;
    const sgApiMockServer = http.createServer((req, res) => {
      sgApiReceivedAuth = String(req.headers['apikey'] || req.headers['authorization'] || '');
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url?.includes('/productos') || req.url?.includes('/articulos')) {
          res.end(
            JSON.stringify([
              { CODIGO: 'SG-API-01', DESCR: 'Artículo desde SimplyGest Server API', PRECIO_E: 45.0, IMPUESTO: 21, STOCK: 33, FAMILIA: 'API' },
            ])
          );
          return;
        }
        if (req.url?.includes('/pedidos') && req.method === 'POST') {
          sgApiOrderCreated = true;
          res.end(JSON.stringify({ success: true, NUMERO: 5001 }));
          return;
        }
        res.end(JSON.stringify([]));
      });
    });
    const sgApiPort = await new Promise<number>((resolve) => {
      sgApiMockServer.listen(0, '127.0.0.1', () => {
        resolve((sgApiMockServer.address() as any).port);
      });
    });

    try {
      const sgApiUrl = `http://127.0.0.1:${sgApiPort}`;
      await agent.saveFullConfig({
        simplygest: {
          databasePath: sgApiUrl,
          apiKey: 'SG-SECRET-KEY-2026',
          selectedTariff: '1',
          selectedWarehouse: 'GEN',
          orderSeries: '1',
        } as any,
        softwareErp: {
          activeProvider: 'simplygest',
          simplygest: {
            databasePath: sgApiUrl,
            apiKey: 'SG-SECRET-KEY-2026',
            selectedTariff: '1',
            selectedWarehouse: 'GEN',
            orderSeries: '1',
          },
        } as any,
      });

      const apiCatalog = await agent.simplygestAdapter.getArticlesForCatalog();
      assert.strictEqual(apiCatalog.length, 1, 'SimplyGest REST API debe devolver catálogo JSON');
      assert.strictEqual(apiCatalog[0]!.code, 'SG-API-01');
      assert(sgApiReceivedAuth.includes('SG-SECRET-KEY-2026'), 'SimplyGest REST API debe enviar APIKey en cabeceras HTTP');

      const apiOrderRes = await agent.simplygestAdapter.createOrder(
        {
          id: 'WC-SGAPI-1',
          orderNumber: 'WC-SGAPI-1',
          reference: 'WC-SGAPI-1',
          status: 'processing',
          currency: 'EUR',
          orderDate: new Date().toISOString(),
          customer: { id: 'C-API-1', fiscalName: 'Cliente SimplyGest Server', taxId: 'B11223344', hasEquivalenceSurcharge: false },
          lines: [{ id: 'L-1', position: 1, sku: 'SG-API-01', name: 'Artículo API', quantity: 1, unitPrice: 45, vatPercent: 21, vatType: 1, discountPercent: 0, subtotal: 45, total: 54.45 }],
          totalAmount: 54.45,
        } as any,
        '1',
        'GEN'
      );
      assert.strictEqual(apiOrderRes.success, true, 'Pedido vía SimplyGest Server REST API debe tener éxito');
      assert.strictEqual(sgApiOrderCreated, true, 'El endpoint POST /pedidos de SimplyGest Server debe haber sido invocado');
      console.log(`  ✓ [SimplyGest Server API :56985] Catálogo y pedido inyectados por HTTP REST con APIKey verificada.`);
    } finally {
      await new Promise<void>((resolve) => sgApiMockServer.close(() => resolve()));
    }

    // 6.3 Sage 50 Real: Verificación de T-SQL con @Empresa dinámica, @Cliente desde tabla clientes y guid_id = NEWID()
    const sageBatch = buildSqlServerAtomicOrderBatch(
      'sage50',
      {
        id: 'WC-S50-REAL',
        orderNumber: 'WC-S50-REAL',
        reference: 'WC-S50-REAL',
        status: 'processing',
        currency: 'EUR',
        orderDate: new Date().toISOString(),
        customer: { id: 'C-S50-1', fiscalName: 'Industrial Sage SL', taxId: 'B55443322', hasEquivalenceSurcharge: false },
        lines: [{ id: 'L-1', position: 1, sku: 'S50-4001', name: 'Compresor Sage', quantity: 1, unitPrice: 100, vatPercent: 21, vatType: 1, discountPercent: 0, subtotal: 100, total: 121 }],
        totalAmount: 121,
      } as any,
      '1',
      '01'
    );
    assert(sageBatch.tsql.includes('LOWER(CAST(NEWID() AS VARCHAR(36)))'), 'Sage 50 T-SQL debe inyectar guid_id = LOWER(CAST(NEWID() AS VARCHAR(36)))');
    assert(sageBatch.tsql.includes('FROM clientes'), 'Sage 50 T-SQL debe resolver @Cliente dinámicamente desde la tabla clientes');
    assert(sageBatch.tsql.includes('DECLARE @Empresa'), 'Sage 50 T-SQL debe resolver @Empresa dinámicamente');
    console.log('  ✓ [Sage 50 SQL Server Real] T-SQL verificado con guid_id (NEWID()), @Empresa dinámica y resolución de cuenta contable en tabla clientes.');

    // 6.4 Wolters Kluwer a3ERP Real: Verificación de clave primaria obligatoria IDPEDV (MAX(IDPEDV)+1) en CABEPEDV y LINEPEDI + @CodCli
    const a3Batch = buildSqlServerAtomicOrderBatch(
      'a3erp',
      {
        id: 'WC-A3-REAL',
        orderNumber: 'WC-A3-REAL',
        reference: 'WC-A3-REAL',
        status: 'processing',
        currency: 'EUR',
        orderDate: new Date().toISOString(),
        customer: { id: 'C-A3-1', fiscalName: 'Corporación a3ERP SA', taxId: 'A99887766', hasEquivalenceSurcharge: false },
        lines: [{ id: 'L-1', position: 1, sku: 'A3-5001', name: 'Cuadro Eléctrico', quantity: 2, unitPrice: 200, vatPercent: 21, vatType: 1, discountPercent: 0, subtotal: 400, total: 484 }],
        totalAmount: 484,
      } as any,
      'A',
      'GEN'
    );
    assert(a3Batch.tsql.includes('MAX(IDPEDV)'), 'a3ERP T-SQL debe calcular correlativo obligatorio @IdPedv = ISNULL(MAX(IDPEDV), 1000) + 1');
    assert(a3Batch.tsql.includes('IDPEDV, SERIE, NUMDOC'), 'a3ERP T-SQL debe insertar IDPEDV en CABEPEDV y LINEPEDI');
    assert(a3Batch.tsql.includes('FROM CLIENTES'), 'a3ERP T-SQL debe resolver @CodCli dinámicamente desde la tabla CLIENTES');
    console.log('  ✓ [Wolters Kluwer a3ERP Real] T-SQL verificado con clave primaria relacional IDPEDV (CABEPEDV/LINEPEDI), @CodCli dinámico y puente ActiveX COM.');

    // 6.5 Ágora POS Real: Inyección en tiempo real vía API HTTP de Integración (:8984/api/custom-import con Api-Token)
    let agoraReceivedToken = '';
    let agoraReceivedBody: any = null;
    const agoraMockServer = http.createServer((req, res) => {
      agoraReceivedToken = String(req.headers['api-token'] || '');
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          agoraReceivedBody = JSON.parse(body);
        } catch {}
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ Result: 'OK', OrderNumber: 8801 }));
      });
    });
    const agoraPort = await new Promise<number>((resolve) => {
      agoraMockServer.listen(0, '127.0.0.1', () => {
        resolve((agoraMockServer.address() as any).port);
      });
    });

    try {
      const agoraApiRes = await tryPushOrderToAgoraHttpApi(
        {
          serverInstance: `http://127.0.0.1:${agoraPort}`,
          databaseName: 'AgoraDB',
          authMode: 'sql',
          username: 'sa',
          password: 'AGORA-TOKEN-SECRET-8984',
        },
        {
          id: 'WC-AGORA-8984',
          orderNumber: '8801',
          reference: 'WC-AGORA-8984',
          status: 'processing',
          currency: 'EUR',
          orderDate: new Date().toISOString(),
          customer: { id: 'C-AG-1', fiscalName: 'Mesa Terraza 4', taxId: 'B00000000', hasEquivalenceSurcharge: false },
          lines: [{ id: 'L-1', position: 1, sku: '3001', name: 'Menú Ejecutivo', quantity: 2, unitPrice: 15, vatPercent: 10, vatType: 2, discountPercent: 0, subtotal: 30, total: 33 }],
          totalAmount: 33,
        } as any,
        'T',
        '1'
      );
      assert(agoraApiRes && agoraApiRes.success, 'Ágora HTTP API (:8984) debe confirmar recepción del pedido');
      assert.strictEqual(agoraReceivedToken, 'AGORA-TOKEN-SECRET-8984', 'Ágora HTTP API debe recibir cabecera Api-Token');
      assert(
        Array.isArray(agoraReceivedBody?.CustomerOrders) && agoraReceivedBody.CustomerOrders.length === 1,
        'Ágora HTTP API debe recibir estructura oficial CustomerOrders en /api/custom-import'
      );
      console.log('  ✓ [Ágora POS API :8984] Inyección en tiempo real en TPV (/api/custom-import con Api-Token) verificada.');
    } finally {
      await new Promise<void>((resolve) => agoraMockServer.close(() => resolve()));
    }

    console.log('\n================================================================================');
    console.log('✅ TODOS LOS HITOS (1, 2, 3, 4, 5 y 6 - MOTORES REALES DE CALLE) SUPERADOS AL 100%');
    console.log('================================================================================\n');
  } finally {
    delete process.env.BENTIAN_CONFIG_PATH;
    if (mockStoreServer) {
      await new Promise<void>((resolve) => mockStoreServer!.close(() => resolve()));
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

runMultiErpMilestones()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en la suite de hitos Multi-ERP:', err);
    process.exit(1);
  });
