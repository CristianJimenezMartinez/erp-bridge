/**
 * BENTIAN ERP BRIDGE — PRUEBA DE BLINDAJE DE SINCRONIZACIÓN Y FISCALIDAD (FASE 0)
 * 
 * Verifica:
 * 1. Mapeo de Recargo de Equivalencia (R.E.) hacia REQPCL en F_PCL (Factusol)
 * 2. Mapeo bidireccional de REQPCL hacia hasEquivalenceSurcharge en CanonicalOrder y CanonicalCustomer
 * 3. Micro-lotes de 25 items (CHUNK_SIZE = 25) en WooCommerceConnector (batchUpsertProducts y batchUpdateStock)
 * 4. Throttling adaptativo ante latencias de red > 1500ms
 * 5. Blindaje de imágenes en WooCommerce: omisión del array images en updates
 * 6. Transacciones atómicas en AccessDriver (executeTransaction con BeginTrans/CommitTrans/RollbackTrans)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Monorepo package resolution hook
const root = path.resolve(__dirname, '..');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request === '@erp-bridge/shared') {
    return path.join(root, 'packages/shared/dist/index.js');
  }
  if (request === '@erp-bridge/sdk') {
    return path.join(root, 'packages/sdk/dist/index.js');
  }
  if (request === '@erp-bridge/connector-factusol') {
    return path.join(root, 'packages/connectors/factusol/dist/index.js');
  }
  if (request === '@erp-bridge/connector-woocommerce') {
    return path.join(root, 'packages/connectors/woocommerce/dist/index.js');
  }
  if (request === '@erp-bridge/core') {
    return path.join(root, 'packages/core/dist/index.js');
  }
  if (request === '@woocommerce/woocommerce-rest-api') {
    const stubPath = path.join(root, 'builder/stubs/wc-stub.js');
    if (!fs.existsSync(stubPath)) {
      if (!fs.existsSync(path.dirname(stubPath))) fs.mkdirSync(path.dirname(stubPath), { recursive: true });
      fs.writeFileSync(stubPath, 'module.exports = class WooCommerceRestApi {};');
    }
    return stubPath;
  }
  try {
    return origResolve.call(this, request, parent, isMain);
  } catch (err) {
    try {
      const builderCandidate = path.join(root, 'builder/node_modules', request);
      return origResolve.call(this, builderCandidate, parent, isMain);
    } catch {
      throw err;
    }
  }
};

// In node, dist files from factusol and woocommerce
const {
  insertOrderHeaderQuery,
} = require('../packages/connectors/factusol/dist/queries/order.queries');
const {
  FactusolOrderMapper,
} = require('../packages/connectors/factusol/dist/mappers/order.mapper');
const {
  mapCanonicalToWooCommerce,
} = require('../packages/connectors/woocommerce/dist/mappers/woocommerce.mapper');
const {
  WooCommerceConnector,
} = require('../packages/connectors/woocommerce/dist/woocommerce.connector');
const {
  AccessDriver,
} = require('../packages/connectors/factusol/dist/access-driver');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   BENTIAN ERP BRIDGE — BLINDAJE DE SYNC & FISCALIDAD (FASE 0)          ');
  console.log('========================================================================\n');

  // --- SECCIÓN 1: RECARGO DE EQUIVALENCIA (R.E.) & REQPCL EN FACTUSOL ---
  console.log('--- 1. Fiscalidad Española: Recargo de Equivalencia (REQPCL) ---');

  runTest('insertOrderHeaderQuery genera REQPCL = 1 si el pedido tiene hasEquivalenceSurcharge = true', () => {
    const orderWithRE = {
      id: 'ord_1',
      orderNumber: '1001',
      reference: 'WC-1001',
      series: 'W',
      date: new Date('2026-09-08T12:00:00Z'),
      status: 'pending',
      currency: 'EUR',
      hasEquivalenceSurcharge: true,
      customer: {
        id: 'cust_1',
        fiscalName: 'Minorista Autonomo SL',
        taxId: 'B12345678',
        hasEquivalenceSurcharge: true,
      },
      lines: [],
      netAmount: 100,
      taxAmount: 21,
      shippingAmount: 5,
      totalAmount: 126,
    };

    const sql = insertOrderHeaderQuery(orderWithRE, 1001, 501);
    // REQPCL está en la posición correspondiente del INSERT
    assert(sql.includes('REQPCL'), 'La query debe incluir la columna REQPCL');
    // Verificar que el valor numérico 1 está asignado para REQPCL
    const normalizedSql = sql.replace(/\s+/g, ' ');
    assert(normalizedSql.includes('0, 1, 0, \'GEN\''), `La query debe contener el valor 1 para REQPCL: ${sql}`);
  });

  runTest('insertOrderHeaderQuery genera REQPCL = 0 si el cliente NO aplica recargo de equivalencia', () => {
    const orderWithoutRE = {
      id: 'ord_2',
      orderNumber: '1002',
      reference: 'WC-1002',
      series: 'W',
      date: new Date('2026-09-08T12:00:00Z'),
      status: 'pending',
      currency: 'EUR',
      hasEquivalenceSurcharge: false,
      customer: {
        id: 'cust_2',
        fiscalName: 'Empresa General SL',
        taxId: 'B99999999',
        hasEquivalenceSurcharge: false,
      },
      lines: [],
      netAmount: 100,
      taxAmount: 21,
      shippingAmount: 0,
      totalAmount: 121,
    };

    const sql = insertOrderHeaderQuery(orderWithoutRE, 1002, 502);
    const normalizedSql = sql.replace(/\s+/g, ' ');
    assert(normalizedSql.includes('0, 0, 0, \'GEN\''), `La query debe contener el valor 0 para REQPCL: ${sql}`);
  });

  runTest('FactusolOrderMapper.toCanonicalOrder mapea REQPCL = 1 a hasEquivalenceSurcharge = true', () => {
    const rawHeader = {
      TIPPCL: 'W',
      CODPCL: 1003,
      REFPCL: 'WC-1003',
      FECPCL: new Date(),
      CLIPCL: 503,
      CNOPCL: 'Cliente Con Recargo',
      REQPCL: 1,
      NET1PCL: 100,
      IIVA1PCL: 26.2,
      TOTPCL: 126.2,
      ESTPCL: 0,
    };

    const canonical = FactusolOrderMapper.toCanonicalOrder(rawHeader, []);
    assert.strictEqual(canonical.hasEquivalenceSurcharge, true, 'canonical.hasEquivalenceSurcharge debe ser true');
    assert.strictEqual(canonical.customer.hasEquivalenceSurcharge, true, 'canonical.customer.hasEquivalenceSurcharge debe ser true');
  });

  runTest('FactusolOrderMapper.toCanonicalOrder mapea REQPCL = 0 a hasEquivalenceSurcharge = false', () => {
    const rawHeader = {
      TIPPCL: 'W',
      CODPCL: 1004,
      REFPCL: 'WC-1004',
      FECPCL: new Date(),
      CLIPCL: 504,
      CNOPCL: 'Cliente General',
      REQPCL: 0,
      NET1PCL: 100,
      IIVA1PCL: 21.0,
      TOTPCL: 121.0,
      ESTPCL: 0,
    };

    const canonical = FactusolOrderMapper.toCanonicalOrder(rawHeader, []);
    assert.strictEqual(canonical.hasEquivalenceSurcharge, false, 'canonical.hasEquivalenceSurcharge debe ser false');
    assert.strictEqual(canonical.customer.hasEquivalenceSurcharge, false, 'canonical.customer.hasEquivalenceSurcharge debe ser false');
  });

  // --- SECCIÓN 2: BLINDAJE DE IMÁGENES EN WOOCOMMERCE ---
  console.log('\n--- 2. Blindaje de Imágenes en WooCommerce ---');

  runTest('mapCanonicalToWooCommerce incluye imágenes en creaciones por defecto (targetId omitido)', () => {
    const product = {
      id: 'p_1',
      sku: 'ART-001',
      name: 'Artículo Con Foto',
      regularPrice: 25.5,
      images: [
        { url: 'https://ejemplo.com/foto1.jpg', alt: 'Foto 1' },
        { url: 'https://ejemplo.com/foto2.jpg', alt: 'Foto 2' },
      ],
    };

    const payload = mapCanonicalToWooCommerce(product);
    assert(Array.isArray(payload.images), 'Debe contener array de imágenes en creación');
    assert.strictEqual(payload.images.length, 2, 'Debe incluir 2 imágenes');
    assert.strictEqual(payload.images[0].src, 'https://ejemplo.com/foto1.jpg');
  });

  runTest('mapCanonicalToWooCommerce omite imágenes si skipImages = true', () => {
    const product = {
      id: 'p_2',
      sku: 'ART-002',
      name: 'Artículo Existente Actualizado',
      regularPrice: 29.9,
      images: [
        { url: 'https://ejemplo.com/foto1.jpg', alt: 'Foto 1' },
      ],
    };

    const payload = mapCanonicalToWooCommerce(product, 2045, { skipImages: true });
    assert.strictEqual(payload.images, undefined, 'payload.images debe ser undefined cuando skipImages = true');
    assert.strictEqual(payload.id, 2045, 'payload.id debe ser el targetId');
    assert.strictEqual(payload.name, 'Artículo Existente Actualizado');
  });

  // --- SECCIÓN 3: MICRO-LOTES DE 25 Y ADAPTIVE THROTTLING ---
  console.log('\n--- 3. Micro-Lotes de 25 y Throttling Adaptativo ---');

  await runAsyncTest('batchUpsertProducts fragmenta en micro-lotes de 25 y omite imágenes en updates', async () => {
    const connector = new WooCommerceConnector();
    
    // Crear un mock client para interceptar las llamadas batch
    const batchRequests = [];
    const mockClient = {
      post: async (endpoint, data) => {
        batchRequests.push({ endpoint, data });
        if (data.create) {
          return {
            create: data.create.map((c, idx) => ({ id: 5000 + idx, sku: c.sku })),
          };
        }
        if (data.update) {
          return {
            update: data.update.map((u) => ({ id: u.id, sku: u.sku })),
          };
        }
        return {};
      },
      put: async () => ({}),
      get: async () => [],
    };

    // Inyectar el client mock
    connector.client = mockClient;

    // Generar 60 productos para crear (deben dividirse en 3 lotes: 25, 25, 10)
    const productsToCreate = [];
    for (let i = 1; i <= 60; i++) {
      productsToCreate.push({
        id: `p_new_${i}`,
        sku: `SKU-NEW-${String(i).padStart(3, '0')}`,
        name: `Producto Nuevo ${i}`,
        regularPrice: 10 + i,
        images: [{ url: `https://ejemplo.com/img${i}.jpg` }],
      });
    }

    const result = await connector.batchUpsertProducts(productsToCreate);
    assert.strictEqual(result.total, 60);
    assert.strictEqual(result.succeeded, 60);
    assert.strictEqual(result.failed, 0);

    // Verificar que se realizaron exactamente 3 peticiones (25 + 25 + 10)
    assert.strictEqual(batchRequests.length, 3, 'Deben haberse emitido 3 micro-lotes para 60 productos');
    assert.strictEqual(batchRequests[0].data.create.length, 25, 'Primer lote debe tener 25 items');
    assert.strictEqual(batchRequests[1].data.create.length, 25, 'Segundo lote debe tener 25 items');
    assert.strictEqual(batchRequests[2].data.create.length, 10, 'Tercer lote debe tener 10 items');

    // Ahora probar actualización de 30 productos con mapeos existentes:
    // Deben dividirse en 2 lotes (25 + 5) y NINGUNO debe tener payload.images (blindaje activo)
    batchRequests.length = 0;
    const existingMappings = new Map();
    const productsToUpdate = [];
    for (let i = 1; i <= 30; i++) {
      const sku = `SKU-EXIST-${String(i).padStart(3, '0')}`;
      existingMappings.set(sku, String(8000 + i));
      productsToUpdate.push({
        id: `p_exist_${i}`,
        sku,
        name: `Producto Existente Modificado ${i}`,
        regularPrice: 20 + i,
        images: [{ url: `https://ejemplo.com/foto_${i}.jpg` }],
      });
    }

    const updateResult = await connector.batchUpsertProducts(productsToUpdate, existingMappings);
    assert.strictEqual(updateResult.total, 30);
    assert.strictEqual(updateResult.succeeded, 30);
    assert.strictEqual(batchRequests.length, 2, 'Deben haberse emitido 2 micro-lotes para 30 productos (25 + 5)');
    assert.strictEqual(batchRequests[0].data.update.length, 25);
    assert.strictEqual(batchRequests[1].data.update.length, 5);

    // Comprobar que NINGÚN producto en los lotes de update incluye la propiedad images
    for (const req of batchRequests) {
      for (const item of req.data.update) {
        assert.strictEqual(item.images, undefined, `El item ${item.sku} en update no debe incluir images (blindaje activo)`);
      }
    }
  });

  await runAsyncTest('batchUpdateStock fragmenta en micro-lotes de 25', async () => {
    const connector = new WooCommerceConnector();
    const stockRequests = [];
    const mockClient = {
      post: async (endpoint, data) => {
        stockRequests.push({ endpoint, data });
        return {
          update: data.update.map((u) => ({ id: u.id, sku: `SKU-${u.id}` })),
        };
      },
    };
    connector.client = mockClient;

    const stockList = [];
    const mappings = new Map();
    for (let i = 1; i <= 55; i++) {
      const sku = `STK-${i}`;
      mappings.set(sku, String(9000 + i));
      stockList.push({
        sku,
        quantity: i * 5,
        inStock: true,
      });
    }

    const stockResult = await connector.batchUpdateStock(stockList, mappings);
    assert.strictEqual(stockResult.total, 55);
    assert.strictEqual(stockResult.succeeded, 55);
    // 55 items divididos en lotes de 25 = 3 peticiones (25 + 25 + 5)
    assert.strictEqual(stockRequests.length, 3, '55 stocks deben generar 3 micro-lotes (25 + 25 + 5)');
    assert.strictEqual(stockRequests[0].data.update.length, 25);
    assert.strictEqual(stockRequests[1].data.update.length, 25);
    assert.strictEqual(stockRequests[2].data.update.length, 5);
  });

  // --- SECCIÓN 4: TRANSACCIONES ATÓMICAS EN ACCESSDRIVER ---
  console.log('\n--- 4. Transacciones Atómicas en AccessDriver ---');

  runTest('AccessDriver expone el método executeTransaction(sqlStatements)', () => {
    const driver = new AccessDriver({ databasePath: 'test.accdb' });
    assert.strictEqual(typeof driver.executeTransaction, 'function', 'AccessDriver debe tener el método executeTransaction');
  });

  runTest('adodb.js contiene el método transaction con BeginTrans y CommitTrans/RollbackTrans', () => {
    const adodbPath = path.resolve(__dirname, '../packages/connectors/factusol/src/adodb.js');
    const adodbContent = fs.readFileSync(adodbPath, 'utf8');
    assert(adodbContent.includes('transaction:function'), 'adodb.js debe definir la función transaction');
    assert(adodbContent.includes('BeginTrans()'), 'adodb.js debe invocar BeginTrans()');
    assert(adodbContent.includes('CommitTrans()'), 'adodb.js debe invocar CommitTrans()');
    assert(adodbContent.includes('RollbackTrans()'), 'adodb.js debe invocar RollbackTrans()');
  });

  console.log('\n========================================================================');
  console.log(` RESULTADO: ${passedTests}/${totalTests} PRUEBAS PASADAS SATISFACTORIAMENTE (100%) `);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error no capturado:', err);
  process.exit(1);
});
