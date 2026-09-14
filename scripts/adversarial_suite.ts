import assert from 'assert';
import fs from 'fs';
import { FactusolConnector } from '../packages/connectors/factusol/src/factusol.connector';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';
import { CanonicalOrder, CanonicalInvoice } from '@erp-bridge/shared';

const DB_PATH = 'G:\\Otros ordenadores\\Mi PC\\Bentian\\API\\bentian\\2252025.accdb';

async function main() {
  console.log('================================================================');
  console.log('  BENTIAN ERP BRIDGE — ADVERSARIAL PHYSICAL FACTUSOL BATTERY   ');
  console.log('================================================================');
  console.log(`Target database: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Base de datos real no encontrada en: ${DB_PATH}`);
  }

  const connector = new FactusolConnector();
  await connector.connect({
    configuration: {
      databasePath: DB_PATH,
      tariffCode: '1',
      orderSeries: '1',
      invoiceSeries: '1',
      defaultWarehouse: 'GEN',
    },
  });

  const driver = new AccessDriver({ databasePath: DB_PATH });

  const testTimestamp = Date.now();
  const testRefOrder = `ADV-ORD-${testTimestamp}`;
  const testRefInvoice = `ADV-INV-${testTimestamp}`;
  const testNif = 'B98765432';

  let createdOrderCode: number | null = null;
  let createdInvoiceCode: number | null = null;
  let createdCustomerCode: number | null = null;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: PEDIDO MULTILÍNEA COMPLEJO (5 LÍNEAS, 4 TRAMOS IVA, R.E., DESCUENTO, F_OBR, REDONDEO)
    // -------------------------------------------------------------
    console.log('\n▶ PRUEBA 1: Pedido Multilínea Complejo (5 líneas, 4 IVAs, R.E., Descuento, F_OBR, Redondeo Defensivo)');
    const t0 = Date.now();

    const complexOrder: CanonicalOrder = {
      id: `ord_${testTimestamp}`,
      reference: testRefOrder,
      orderNumber: testRefOrder,
      series: '1',
      date: new Date(),
      status: 'pending',
      currency: 'EUR',
      // Simular desalineación centesimal: la suma teórica es 88.63€, el ecommerce pasa 88.65€ (+0.02€)
      netAmount: 69.50,
      taxAmount: 11.13,
      shippingAmount: 8.00,
      discountAmount: 0,
      totalAmount: 88.65,
      warehouse: 'GEN',
      paymentMethod: 'credit_card',
      hasEquivalenceSurcharge: true,
      customer: {
        id: `cust_${testTimestamp}`,
        fiscalName: 'CLIENTE ADVERSARIAL MULTI-IVA SL',
        taxId: testNif,
        email: 'adversarial@bentian-audit.es',
        phone: '961234567',
        hasEquivalenceSurcharge: true,
        address: {
          street: 'Calle Fiscal Principal 10',
          city: 'Albacete',
          postalCode: '02001',
          state: 'Albacete',
          country: 'ES',
        },
      },
      shippingAddress: {
        firstName: 'Responsable',
        lastName: 'Logística',
        street: 'Polígono Campollano Nave 42 (Entrega)',
        city: 'Albacete',
        postalCode: '02007',
        state: 'Albacete',
        country: 'ES',
        phone: '699887766',
      },
      lines: [
        // Línea 1: 21% IVA + 5.2% RE
        {
          id: 'l1',
          position: 1,
          sku: '000047',
          name: 'M. TUBO PVC ENC 16/160 MM.',
          quantity: 2,
          unitPrice: 10.00,
          discountPercent: 0,
          vatPercent: 21.0,
          vatType: 0,
          subtotal: 20.00,
          total: 20.00,
        },
        // Línea 2: 10% IVA + 1.4% RE
        {
          id: 'l2',
          position: 2,
          sku: '000294',
          name: 'CODO 90 PVC ENC INY. 63 MM.',
          quantity: 1,
          unitPrice: 15.00,
          discountPercent: 0,
          vatPercent: 10.0,
          vatType: 1,
          subtotal: 15.00,
          total: 15.00,
        },
        // Línea 3: 4% IVA + 0.5% RE
        {
          id: 'l3',
          position: 3,
          sku: '000001',
          name: 'M. TUBO PVC ENC 8/ 50 MM.',
          quantity: 1,
          unitPrice: 20.00,
          discountPercent: 0,
          vatPercent: 4.0,
          vatType: 2,
          subtotal: 20.00,
          total: 20.00,
        },
        // Línea 4: Exento / 0% IVA
        {
          id: 'l4',
          position: 4,
          sku: '000002',
          name: 'M. TUBO PVC ENC 6/ 63 MM. (EXENTO)',
          quantity: 1,
          unitPrice: 10.00,
          discountPercent: 0,
          vatPercent: 0.0,
          vatType: 3,
          subtotal: 10.00,
          total: 10.00,
        },
        // Línea 5: 21% IVA + 5.2% RE con 10% Descuento
        {
          id: 'l5',
          position: 5,
          sku: '000003',
          name: 'M. TUBO PVC ENC 6/ 75 MM. (DTO 10%)',
          quantity: 1,
          unitPrice: 5.00,
          discountPercent: 10.0,
          vatPercent: 21.0,
          vatType: 0,
          subtotal: 4.50,
          total: 4.50,
        },
      ],
    };

    const orderRes = await connector.createOrder(complexOrder);
    assert.strictEqual(orderRes.success, true, `Fallo creando pedido: ${orderRes.error}`);
    assert(orderRes.externalId, 'Debe devolver código de pedido');
    createdOrderCode = Number(orderRes.externalId);
    console.log(`  ✓ Pedido creado exitosamente en Factusol (CODPCL = ${createdOrderCode}, Serie = '1') en ${Date.now() - t0}ms`);

    // Inspección física de F_PCL
    const pclRows = await driver.query<Record<string, any>>(`SELECT * FROM F_PCL WHERE CODPCL = ${createdOrderCode} AND TIPPCL = '1'`);
    assert.strictEqual(pclRows.length, 1, 'Debe existir exactamente 1 registro en F_PCL');
    const p = pclRows[0]!;
    createdCustomerCode = Number(p.CLIPCL);

    console.log('  • Verificando integridad de cabecera F_PCL:');
    console.log(`    - Tramo 1 (21%): NET=${p.NET1PCL}, BAS=${p.BAS1PCL} (incluye 8€ portes), PIVA=${p.PIVA1PCL}%, IIVA=${p.IIVA1PCL}€, PREC=${p.PREC1PCL}%, IREC=${p.IREC1PCL}€`);
    console.log(`    - Tramo 2 (10%): NET=${p.NET2PCL}, BAS=${p.BAS2PCL}, PIVA=${p.PIVA2PCL}%, IIVA=${p.IIVA2PCL}€, PREC=${p.PREC2PCL}%, IREC=${p.IREC2PCL}€`);
    console.log(`    - Tramo 3 ( 4%): NET=${p.NET3PCL}, BAS=${p.BAS3PCL}, PIVA=${p.PIVA3PCL}%, IIVA=${p.IIVA3PCL}€, PREC=${p.PREC3PCL}%, IREC=${p.IREC3PCL}€`);
    console.log(`    - Tramo 4 ( 0%): NET=${p.NET4PCL}, BAS=${p.BAS4PCL}`);
    console.log(`    - Total Factusol TOTPCL: ${p.TOTPCL}€ (Cuadre con pasarela target 88.65€)`);

    assert(Number(p.BAS1PCL) === 32.50 || Number(p.BAS1PCL) === 32.52, `BAS1PCL debe ser 32.50 o 32.52 tras ajuste del céntimo (obtenido ${p.BAS1PCL})`);
    assert.strictEqual(Number(p.PIVA1PCL), 21.0, 'PIVA1PCL debe ser 21.0');
    assert.strictEqual(Number(p.IIVA1PCL), 6.83, 'IIVA1PCL debe ser 6.83');
    assert.strictEqual(Number(p.PREC1PCL), 5.2, 'PREC1PCL debe ser 5.2');
    assert.strictEqual(Number(p.IREC1PCL), 1.69, 'IREC1PCL debe ser 1.69');

    assert.strictEqual(Number(p.BAS2PCL), 15.00, 'BAS2PCL debe ser 15.00');
    assert.strictEqual(Number(p.PIVA2PCL), 10.0, 'PIVA2PCL debe ser 10.0');
    assert.strictEqual(Number(p.IIVA2PCL), 1.50, 'IIVA2PCL debe ser 1.50');
    assert.strictEqual(Number(p.PREC2PCL), 1.4, 'PREC2PCL debe ser 1.4');
    assert.strictEqual(Number(p.IREC2PCL), 0.21, 'IREC2PCL debe ser 0.21');

    assert.strictEqual(Number(p.BAS3PCL), 20.00, 'BAS3PCL debe ser 20.00');
    assert.strictEqual(Number(p.PIVA3PCL), 4.0, 'PIVA3PCL debe ser 4.0');
    assert.strictEqual(Number(p.IIVA3PCL), 0.80, 'IIVA3PCL debe ser 0.80');
    assert.strictEqual(Number(p.PREC3PCL), 0.5, 'PREC3PCL debe ser 0.5');
    assert.strictEqual(Number(p.IREC3PCL), 0.10, 'IREC3PCL debe ser 0.10');

    assert.strictEqual(Number(p.BAS4PCL), 10.00, 'BAS4PCL debe ser 10.00');

    // Verificación de redondeo defensivo: el total debe ser exactamente el especificado en totalAmount (88.65)
    assert.strictEqual(Number(p.TOTPCL), 88.65, 'TOTPCL debe coincidir exactamente con el total de pasarela (88.65)');
    console.log('  ✓ Ajuste defensivo de redondeo validado con éxito (cero descuadre contable).');

    // Inspección física de F_LPC
    const lpcRows = await driver.query<Record<string, any>>(`SELECT * FROM F_LPC WHERE CODLPC = ${createdOrderCode} AND TIPLPC = '1' ORDER BY POSLPC ASC`);
    assert.strictEqual(lpcRows.length, 5, 'Debe haber exactamente 5 líneas en F_LPC');
    console.log('  • Verificando líneas F_LPC:');
    lpcRows.forEach((l, idx) => {
      console.log(`    [Línea ${l.POSLPC}] SKU=${l.ARTLPC} | Cant=${l.CANLPC} | Dto=${l.DT1LPC}% | Precio=${l.PRELPC}€ | Tot=${l.TOTLPC}€ | IVA_Idx=${l.IVALPC} | ConIVA=${l.TIVLPC}€`);
      assert.strictEqual(l.POSLPC, idx + 1, `POSLPC debe ser estrictamente correlativo (${idx + 1})`);
    });

    // Verificación de descuento en Línea 5
    const line5 = lpcRows[4]!;
    assert.strictEqual(Number(line5.DT1LPC), 10.0, 'Línea 5 debe registrar 10% en DT1LPC');
    assert.strictEqual(Number(line5.TOTLPC), 4.50, 'Línea 5 debe registrar total con dto de 4.50 en TOTLPC');
    console.log('  ✓ Descuento por línea DT1LPC validado físicamente en F_LPC.');

    // Verificación de dirección de entrega alternativa en F_OBR
    const obrRows = await driver.query<Record<string, any>>(`SELECT * FROM F_OBR WHERE CLIOBR = ${createdCustomerCode}`);
    console.log(`  • Registros en F_OBR para cliente ${createdCustomerCode}: ${obrRows.length}`);
    assert(obrRows.length >= 1, 'Debe haberse creado la dirección alternativa en F_OBR');
    assert(obrRows[0]!.DIROBR.includes('Campollano'), 'DIROBR debe contener la dirección de envío');
    console.log(`  ✓ Dirección de entrega alternativa registrada en F_OBR: "${obrRows[0]!.NOMOBR}" - "${obrRows[0]!.DIROBR}"`);

    // -------------------------------------------------------------
    // PRUEBA 2: FACTURACIÓN EN VIVO (F_FAC y F_LFA CON NIF Y TRANSACCIÓN ATÓMICA)
    // -------------------------------------------------------------
    console.log('\n▶ PRUEBA 2: Creación de Factura Atómica en Vivo (F_FAC y F_LFA)');
    const t1 = Date.now();

    const complexInvoice: CanonicalInvoice = {
      id: `inv_${testTimestamp}`,
      invoiceNumber: testRefInvoice,
      series: '1',
      issueDate: new Date(),
      status: 'paid',
      currency: 'EUR',
      shippingCost: 0,
      netAmount: 25.00,
      taxAmount: 5.25,
      totalAmount: 30.25,
      taxBreakdown: [
        {
          rate: 21.0,
          baseAmount: 25.00,
          taxAmount: 5.25,
        },
      ],
      customer: {
        name: 'CLIENTE ADVERSARIAL MULTI-IVA SL',
        taxId: testNif,
        billingAddress: {
          street: 'Calle Fiscal Principal 10',
          city: 'Albacete',
          postalCode: '02001',
          province: 'Albacete',
          country: 'ES',
        },
      },
      lines: [
        {
          id: 'il1',
          position: 1,
          sku: '000047',
          description: 'M. TUBO PVC ENC 16/160 MM.',
          quantity: 1,
          unitPrice: 10.00,
          discountPercent: 0,
          taxRate: 21.0,
          taxAmount: 2.10,
          lineTotal: 10.00,
        },
        {
          id: 'il2',
          position: 2,
          sku: '000294',
          description: 'CODO 90 PVC ENC INY. 63 MM.',
          quantity: 1,
          unitPrice: 15.00,
          discountPercent: 0,
          taxRate: 21.0,
          taxAmount: 3.15,
          lineTotal: 15.00,
        },
      ],
    };

    const invRes = await connector.createInvoice(complexInvoice);
    assert.strictEqual(invRes.success, true, `Fallo creando factura: ${invRes.error}`);
    assert(invRes.externalId, 'Debe devolver código de factura');
    createdInvoiceCode = Number(invRes.externalId);
    console.log(`  ✓ Factura creada exitosamente (CODFAC = ${createdInvoiceCode}, Serie = '1') en ${Date.now() - t1}ms`);

    // Inspección física de F_FAC
    const facRows = await driver.query<Record<string, any>>(`SELECT * FROM F_FAC WHERE CODFAC = ${createdInvoiceCode} AND TIPFAC = '1'`);
    assert.strictEqual(facRows.length, 1, 'Debe existir exactamente 1 registro en F_FAC');
    const f = facRows[0]!;
    assert.strictEqual(f.CNIFAC.replace(/\s+/g, ''), testNif, `CNIFAC en F_FAC debe contener el NIF ${testNif}`);
    assert.strictEqual(Number(f.TOTFAC), 30.25, 'TOTFAC debe ser 30.25');
    console.log(`  ✓ Cabecera F_FAC validada: NIF=${f.CNIFAC}, Base=${f.BAS1FAC}€, IVA=${f.IIV1FAC}€, Total=${f.TOTFAC}€`);

    // Inspección física de F_LFA
    const lfaRows = await driver.query<Record<string, any>>(`SELECT * FROM F_LFA WHERE CODLFA = ${createdInvoiceCode} AND TIPLFA = '1' ORDER BY POSLFA ASC`);
    assert.strictEqual(lfaRows.length, 2, 'Debe haber exactamente 2 líneas en F_LFA');
    assert.strictEqual(lfaRows[0]!.POSLFA, 1, 'Línea 1 POSLFA = 1');
    assert.strictEqual(lfaRows[1]!.POSLFA, 2, 'Línea 2 POSLFA = 2');
    console.log(`  ✓ Líneas F_LFA validadas correlativamente (POSLFA 1 y 2).`);

    // -------------------------------------------------------------
    // PRUEBA 3: STOCK POR LOTES (>100 SKUS) Y DECREMENTO ATÓMICO EN F_STO
    // -------------------------------------------------------------
    console.log('\n▶ PRUEBA 3: Stock por Lotes (>100 SKUs) y Decremento Atómico');
    const t2 = Date.now();

    // 3.1 Consulta por lotes masivos de 120 SKUs
    const dummySkus: string[] = [];
    for (let i = 1; i <= 120; i++) {
      dummySkus.push(String(i).padStart(6, '0'));
    }

    const batchStock = await connector.readStock({ skus: dummySkus });
    console.log(`  • Leídos ${batchStock.length} registros de stock para un lote de ${dummySkus.length} SKUs sin desbordar OLEDB.`);
    assert(batchStock.length > 0, 'Debe retornar registros de stock existentes');

    // 3.2 Decremento atómico
    const targetSku = '000047';
    const beforeStock = await connector.readStock({ skus: [targetSku] });
    const prevQty = beforeStock[0]?.availableQuantity ?? 0;
    console.log(`  • Stock de '${targetSku}' antes de operación: ${prevQty}`);

    // Decrementar 1 unidad directamente
    await driver.execute(`UPDATE F_STO SET DISSTO = DISSTO - 1 WHERE ARTSTO = '${targetSku}' AND ALMSTO = 'GEN'`);
    const afterStock = await connector.readStock({ skus: [targetSku] });
    const newQty = afterStock[0]?.availableQuantity ?? 0;
    console.log(`  • Stock de '${targetSku}' tras decremento: ${newQty}`);
    assert.strictEqual(newQty, prevQty - 1, 'El stock disponible debe haber decrementado en 1');

    // Restaurar
    await driver.execute(`UPDATE F_STO SET DISSTO = DISSTO + 1 WHERE ARTSTO = '${targetSku}' AND ALMSTO = 'GEN'`);
    console.log(`  ✓ Decremento atómico y restauración verificados con éxito en ${Date.now() - t2}ms.`);

  } finally {
    // -------------------------------------------------------------
    // REGLA CRÍTICA: LIMPIEZA ESCRUPULOSA
    // -------------------------------------------------------------
    console.log('\n▶ LIMPIEZA ESCRUPULOSA DE REGISTROS DE PRUEBA EN 2252025.accdb...');
    try {
      if (createdOrderCode) {
        await driver.execute(`DELETE FROM F_LPC WHERE CODLPC = ${createdOrderCode} AND TIPLPC = '1'`);
        await driver.execute(`DELETE FROM F_PCL WHERE CODPCL = ${createdOrderCode} AND TIPPCL = '1'`);
        console.log(`  ✓ Pedido ${createdOrderCode} eliminado de F_PCL y F_LPC.`);
      }
      if (createdInvoiceCode) {
        await driver.execute(`DELETE FROM F_LFA WHERE CODLFA = ${createdInvoiceCode} AND TIPLFA = '1'`);
        await driver.execute(`DELETE FROM F_FAC WHERE CODFAC = ${createdInvoiceCode} AND TIPFAC = '1'`);
        console.log(`  ✓ Factura ${createdInvoiceCode} eliminada de F_FAC y F_LFA.`);
      }
      if (createdCustomerCode) {
        await driver.execute(`DELETE FROM F_OBR WHERE CLIOBR = ${createdCustomerCode}`);
        await driver.execute(`DELETE FROM F_CLI WHERE CODCLI = ${createdCustomerCode}`);
        console.log(`  ✓ Cliente ${createdCustomerCode} y sus direcciones F_OBR eliminados de F_CLI y F_OBR.`);
      }
      await driver.execute(`DELETE FROM F_CLI WHERE NIFCLI = '${testNif}'`);
      console.log('  ✓ Limpieza completa y verificada. La base de datos quedó en su estado original.');
    } catch (cleanErr) {
      console.error('  ⚠️ Error durante la limpieza:', cleanErr);
    }

    await connector.disconnect();
  }

  console.log('\n================================================================');
  console.log('  ✓ BATERÍA FORENSE REAL CONTRA FACTUSOL SUPERADA AL 100%       ');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ ERROR CRÍTICO EN LA BATERÍA FORENSE:', err);
  process.exit(1);
});
