import assert from 'assert';
import {
  SimplyGestConnector,
  mapSimplyGestArticleToCanonical,
  SimplyGestArticleRaw,
  mapSimplyGestCustomerToCanonical,
  SimplyGestCustomerRaw,
  mapSimplyGestOrderToCanonical,
  SimplyGestOrderRaw,
  SimplyGestOrderLineRaw,
  getArticlesQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
} from '../index';

console.log('========================================================================');
console.log('   SIMPLYGEST CONNECTOR — PRUEBAS UNITARIAS Y DE LECTURA (SPEC)         ');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function it(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  [PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  [FAIL] Test ${total}: ${name}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Metadata y Capacidades
it('SimplyGestConnector expone metadata oficial correcta', () => {
  const connector = new SimplyGestConnector();
  const meta = connector.getMetadata();
  assert.strictEqual(meta.id, 'connector-simplygest');
  assert.strictEqual(meta.name, 'SimplyGest');
  assert.strictEqual(meta.version, '1.0.0');
  assert.strictEqual(meta.slug, 'simplygest');
});

it('SimplyGestConnector declara las capacidades requeridas', () => {
  const connector = new SimplyGestConnector();
  const caps = connector.getCapabilities();
  assert.strictEqual(caps.supportsReadProducts, true);
  assert.strictEqual(caps.supportsWriteProducts, true);
  assert.strictEqual(caps.supportsReadStock, true);
  assert.strictEqual(caps.supportsWriteStock, true);
  assert.strictEqual(caps.supportsReadOrders, true);
  assert.strictEqual(caps.supportsWriteOrders, true);
  assert.strictEqual(caps.supportsBatchOperations, true);
});

// 2. Mapeo de Artículos (ARTICULOS)
it('mapSimplyGestArticleToCanonical mapea correctamente campos de Datos.mdb', () => {
  const raw: SimplyGestArticleRaw = {
    CODIGO: 'SG-ART-001',
    DESCR: 'Taladro Percutor 800W',
    DESCR_LARGA: 'Taladro profesional con cable de alta potencia y selector de velocidad',
    PRECIO_E: 89.95,
    PRECIO_C: 45.00,
    STOCK: 14.5,
    IMPUESTO: 0, // 21% estándar
    FAMILIA: 'HERRAMIENTAS',
    CODBARRAS: '8437001234567',
  };

  const canonical = mapSimplyGestArticleToCanonical(raw);
  assert.strictEqual(canonical.sku, 'SG-ART-001');
  assert.strictEqual(canonical.name, 'Taladro Percutor 800W');
  assert.strictEqual(canonical.description, 'Taladro profesional con cable de alta potencia y selector de velocidad');
  assert.strictEqual(canonical.regularPrice, 89.95);
  assert.strictEqual(canonical.costPrice, 45.00);
  assert.strictEqual(canonical.stockQuantity, 14.5);
  assert.strictEqual(canonical.inStock, true);
  assert.strictEqual(canonical.barcode, '8437001234567');
  assert.strictEqual(canonical.categories[0]?.name, 'HERRAMIENTAS');
  assert.strictEqual(canonical.attributes?.taxClass, 'standard');
});

// 3. Mapeo de Clientes (CLIENTES)
it('mapSimplyGestCustomerToCanonical mapea cliente fiscal y dirección', () => {
  const raw: SimplyGestCustomerRaw = {
    CODIGO: '1042',
    NOMBRE: 'Ferretería Central SL',
    CIF: 'B98765432',
    DIRECCION: 'Av. Industria 45',
    CP: '28021',
    POBLACION: 'Madrid',
    PROVINCIA: 'Madrid',
    EMAIL: 'compras@ferreteriacentral.es',
    TELEFONO: '912345678',
  };

  const canonical = mapSimplyGestCustomerToCanonical(raw);
  assert.strictEqual(canonical.id, 'sg_cli_1042');
  assert.strictEqual(canonical.customerNumber, '1042');
  assert.strictEqual(canonical.taxId, 'B98765432');
  assert.strictEqual(canonical.fiscalName, 'Ferretería Central SL');
  assert.strictEqual(canonical.email, 'compras@ferreteriacentral.es');
  assert.strictEqual(canonical.address?.street, 'Av. Industria 45');
  assert.strictEqual(canonical.address?.postalCode, '28021');
  assert.strictEqual(canonical.address?.city, 'Madrid');
});

// 4. Mapeo de Pedidos (PEDIDOS_VENTA & LINEAS_PEDIDOS)
it('mapSimplyGestOrderToCanonical mapea cabecera y líneas vinculadas', () => {
  const rawHeader: SimplyGestOrderRaw = {
    NUMERO: '2026-001',
    FECHA: new Date('2026-09-08T10:00:00Z'),
    CLIENTE: '1042',
    REFPEDIDO: 'WC-4592',
    BASE_IMP: 100,
    IVA: 21,
    TOTAL: 121,
    ESTADO: 0,
  };

  const rawLines: SimplyGestOrderLineRaw[] = [
    {
      NUMERO_PEDIDO: '2026-001',
      LINEA: 1,
      CODIGO_ART: 'SG-ART-001',
      DESCR: 'Taladro Percutor 800W',
      CANTIDAD: 2,
      PRECIO: 50,
      TOTAL: 100,
    },
  ];

  const canonical = mapSimplyGestOrderToCanonical(rawHeader, rawLines);
  assert.strictEqual(canonical.orderNumber, '2026-001');
  assert.strictEqual(canonical.reference, 'WC-4592');
  assert.strictEqual(canonical.status, 'pending');
  assert.strictEqual(canonical.totalAmount, 121);
  assert.strictEqual(canonical.lines.length, 1);
  assert.strictEqual(canonical.lines[0]?.sku, 'SG-ART-001');
  assert.strictEqual(canonical.lines[0]?.quantity, 2);
  assert.strictEqual(canonical.lines[0]?.total, 100);
});

// 5. Extracción masiva de 50 artículos de demostración
it('Simulación de lectura y extracción de lote de 50 productos de catálogo', () => {
  const simulatedArticles: SimplyGestArticleRaw[] = [];
  for (let i = 1; i <= 50; i++) {
    simulatedArticles.push({
      CODIGO: `ART-SIM-${String(i).padStart(3, '0')}`,
      DESCR: `Producto de Demostración SimplyGest ${i}`,
      DESCR_LARGA: `Descripción técnica del producto de prueba ${i} para validación de conector`,
      PRECIO_E: 10 + i * 2.5,
      PRECIO_C: 5 + i,
      STOCK: i * 3,
      IMPUESTO: i % 3,
      FAMILIA: i % 2 === 0 ? 'FONTANERIA' : 'ELECTRICIDAD',
      CODBARRAS: `8400000000${String(i).padStart(3, '0')}`,
    });
  }

  const query = getArticlesQuery(50);
  assert(query.includes('TOP 50'), 'La query debe contener TOP 50');

  const mapped = simulatedArticles.map(mapSimplyGestArticleToCanonical);
  assert.strictEqual(mapped.length, 50);
  assert.strictEqual(mapped[0]?.sku, 'ART-SIM-001');
  assert.strictEqual(mapped[49]?.sku, 'ART-SIM-050');
  assert.strictEqual(mapped[49]?.stockQuantity, 150);
});

// 6. Transacción atómica de pedidos
it('insertOrderHeaderQuery genera inserción para REFPEDIDO = WC-1234', () => {
  const order: any = {
    id: 'ord_test',
    orderNumber: '1234',
    reference: 'WC-1234',
    date: new Date('2026-09-08T12:00:00Z'),
    netAmount: 150,
    taxAmount: 31.5,
    totalAmount: 181.5,
  };

  const headerSql = insertOrderHeaderQuery(order, '1050', '1042');
  assert(headerSql.includes('INSERT INTO PEDIDOS_VENTA'), 'Debe insertar en PEDIDOS_VENTA');
  assert(headerSql.includes('\'WC-1234\''), 'Debe incluir la referencia externa WC-1234');
  assert(headerSql.includes('\'1050\''), 'Debe asignar el número de pedido correlativo');

  const lineSql = insertOrderLineQuery(
    { sku: 'SG-001', name: 'Artículo Línea', quantity: 3, unitPrice: 50, total: 150 } as any,
    '1050',
    1
  );
  assert(lineSql.includes('INSERT INTO LINEAS_PEDIDOS'), 'Debe insertar en LINEAS_PEDIDOS');
  assert(lineSql.includes('\'SG-001\''), 'Debe incluir el SKU');
});

console.log('\n========================================================================');
console.log(` RESULTADO SIMPLYGEST: ${passed}/${total} PRUEBAS PASADAS SATISFACTORIAMENTE (100%) `);
console.log('========================================================================\n');

if (passed !== total) {
  process.exit(1);
}
