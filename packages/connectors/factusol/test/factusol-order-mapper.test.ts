import assert from 'assert';
import { FactusolOrderMapper } from '../src/mappers/order.mapper';
import {
  insertCustomerQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
} from '../src/queries';

console.log('--- Running Factusol Order Mapper Tests ---');

// 1. Status Code Mapping
assert.strictEqual(FactusolOrderMapper.mapStatusCodeToOrderStatus(0), 'pending');
assert.strictEqual(FactusolOrderMapper.mapStatusCodeToOrderStatus(2), 'completed');
assert.strictEqual(FactusolOrderMapper.mapStatusCodeToOrderStatus(4), 'cancelled');
assert.strictEqual(FactusolOrderMapper.mapOrderStatusToStatusCode('pending'), 0);
assert.strictEqual(FactusolOrderMapper.mapOrderStatusToStatusCode('completed'), 2);

// 2. Factusol Customer mapping
const canonicalCust = FactusolOrderMapper.toCanonicalCustomer({
  CODCLI: 105,
  NOFCLI: 'FONTANERIA GOMEZ SL',
  NIFCLI: 'B12345678',
  DOMCLI: 'Av. Constitucion 45',
  POBCLI: 'Valencia',
  CPOCLI: '46001',
  PROCLI: 'Valencia',
  TELCLI: '963112233',
  OBSCLI: 'info@fontaneriagomez.com',
});

assert.strictEqual(canonicalCust.customerNumber, '105');
assert.strictEqual(canonicalCust.fiscalName, 'FONTANERIA GOMEZ SL');
assert.strictEqual(canonicalCust.taxId, 'B12345678');
assert.strictEqual(canonicalCust.email, 'info@fontaneriagomez.com');

// 3. SQL generation
const sampleOrder: any = {
  id: 'order_test',
  orderNumber: '9901',
  series: '1',
  reference: 'WC-9901',
  date: new Date('2026-08-24T12:00:00Z'),
  status: 'pending',
  customer: canonicalCust,
  lines: [
    {
      id: 'ln_1',
      position: 1,
      sku: '000001',
      name: 'M. TUBO PVC ENC 8/ 50 MM.',
      quantity: 10,
      unitPrice: 1.92,
      discountPercent: 0,
      vatPercent: 21,
      vatType: 0,
      subtotal: 19.2,
      total: 19.2,
    },
  ],
  netAmount: 19.2,
  taxAmount: 4.03,
  shippingAmount: 5.0,
  discountAmount: 0,
  totalAmount: 28.23,
  currency: 'EUR',
  warehouse: 'GEN',
};

const customerSql = insertCustomerQuery(canonicalCust, 105);
assert(customerSql.includes('INSERT INTO F_CLI'));
assert(customerSql.includes('105'));
assert(customerSql.includes('FONTANERIA GOMEZ SL'));
assert(customerSql.includes('PAICLI'), 'Query must include PAICLI column');
assert(customerSql.includes("'724'"), 'PAICLI must be 724 for Spain');
assert(customerSql.includes('IVACLI'), 'Query must include IVACLI column');
assert(customerSql.includes('FPACLI'), 'Query must include FPACLI column');
assert(customerSql.includes("'TRF'"), 'Default payment method must be TRF');
assert(customerSql.includes('ESTCLI'), 'Query must include ESTCLI column');

// Test customer with equivalence surcharge
const surchargeCust = { ...canonicalCust, hasEquivalenceSurcharge: true };
const surchargeCustSql = insertCustomerQuery(surchargeCust, 106);
assert(surchargeCustSql.includes('REQCLI'));

const headerSql = insertOrderHeaderQuery(sampleOrder, 9901, 105);
assert(headerSql.includes('INSERT INTO F_PCL'));
assert(headerSql.includes("'1'"));
assert(headerSql.includes('9901'));
assert(headerSql.includes("'WC-9901'"));
assert(headerSql.includes("'724'"), 'Header must include country code 724');
assert(headerSql.includes('USUPCL'), 'Header must include USUPCL');
assert(headerSql.includes('HORPCL'), 'Header must include HORPCL');
assert(headerSql.includes('NET1PCL'), 'Header must include NET1PCL');
assert(headerSql.includes('BAS1PCL'), 'Header must include BAS1PCL');
assert(headerSql.includes('NET2PCL'), 'Header must include NET2PCL');
assert(headerSql.includes('NET3PCL'), 'Header must include NET3PCL');
assert(headerSql.includes('NET4PCL'), 'Header must include NET4PCL');

const lineSql = insertOrderLineQuery(sampleOrder.lines[0]!, 9901, '1');
assert(lineSql.includes('INSERT INTO F_LPC'));
assert(lineSql.includes('9901'));
assert(lineSql.includes("'000001'"));
assert(lineSql.includes('PENLPC'), 'Line SQL must include PENLPC');
assert(!lineSql.includes('ALMLPC'), 'F_LPC must NOT include ALMLPC');
assert(!lineSql.includes('REQLPC'), 'F_LPC must NOT include REQLPC');

// 4. Multi-tramo VAT breakdown test
import {
  calculateOrderVatBreakdown,
  determineTivpcl,
  decrementStockQuery,
  incrementStockQuery,
  insertDeliveryAddressQuery,
  sanitizeAndTruncate,
} from '../src/queries';

const multiVatOrder: any = {
  id: 'multi_vat',
  orderNumber: '8801',
  date: new Date('2026-09-14'),
  status: 'pending',
  customer: {
    id: 'c1',
    fiscalName: 'EMPRESA SL',
    hasEquivalenceSurcharge: true,
  },
  lines: [
    {
      id: 'l1',
      position: 1,
      sku: 'SKU21',
      name: 'Item 21%',
      quantity: 2,
      unitPrice: 10, // net = 20.00
      vatPercent: 21,
      vatType: 0,
      discountPercent: 0,
      subtotal: 20,
      total: 20,
    },
    {
      id: 'l2',
      position: 2,
      sku: 'SKU10',
      name: 'Item 10%',
      quantity: 1,
      unitPrice: 30, // net = 30.00
      vatPercent: 10,
      vatType: 1,
      discountPercent: 0,
      subtotal: 30,
      total: 30,
    },
    {
      id: 'l3',
      position: 3,
      sku: 'SKU04',
      name: 'Item 4%',
      quantity: 5,
      unitPrice: 2, // net = 10.00
      vatPercent: 4,
      vatType: 2,
      discountPercent: 0,
      subtotal: 10,
      total: 10,
    },
    {
      id: 'l4',
      position: 4,
      sku: 'SKU00',
      name: 'Item Exento',
      quantity: 1,
      unitPrice: 15, // net = 15.00
      vatPercent: 0,
      vatType: 3,
      discountPercent: 0,
      subtotal: 15,
      total: 15,
    },
  ],
  shippingAmount: 5.0,
  totalAmount: 90.42, // Exact total with RE
  currency: 'EUR',
};

const breakdown = calculateOrderVatBreakdown(multiVatOrder);
assert.strictEqual(breakdown.net1, 20.0);
assert.strictEqual(breakdown.shipping, 5.0);
assert.strictEqual(breakdown.bas1, 25.0, 'Identidad algebraica: BAS1 = NET1 + IPOR1');
assert.strictEqual(breakdown.piva1, 21.0);
assert.strictEqual(breakdown.iiva1, 5.25); // 25 * 0.21
assert.strictEqual(breakdown.prec1, 5.2);
assert.strictEqual(breakdown.irec1, 1.3); // 25 * 0.052

assert.strictEqual(breakdown.net2, 30.0);
assert.strictEqual(breakdown.bas2, 30.0);
assert.strictEqual(breakdown.piva2, 10.0);
assert.strictEqual(breakdown.iiva2, 3.0); // 30 * 0.10
assert.strictEqual(breakdown.prec2, 1.4);
assert.strictEqual(breakdown.irec2, 0.42); // 30 * 0.014

assert.strictEqual(breakdown.net3, 10.0);
assert.strictEqual(breakdown.bas3, 10.0);
assert.strictEqual(breakdown.piva3, 4.0);
assert.strictEqual(breakdown.iiva3, 0.4); // 10 * 0.04
assert.strictEqual(breakdown.prec3, 0.5);
assert.strictEqual(breakdown.irec3, 0.05); // 10 * 0.005

assert.strictEqual(breakdown.net4, 15.0);
assert.strictEqual(breakdown.bas4, 15.0);

// 5. Cent Rounding (Ajuste del céntimo ±0.01)
const orderWithCentDiff: any = {
  ...multiVatOrder,
  totalAmount: 90.43, // Differs by +0.01 from 90.42
};
const centBreakdown = calculateOrderVatBreakdown(orderWithCentDiff);
assert.strictEqual(centBreakdown.total, 90.43, 'Total must match target exactly');
assert.strictEqual(centBreakdown.shipping, 5.01, 'Diff of 0.01 compensated in shipping');
assert.strictEqual(centBreakdown.bas1, 25.01, 'BAS1 = NET1 + shipping adjusted');

// 6. TIVPCL determination tests
// Nacional
assert.strictEqual(determineTivpcl({ ...sampleOrder, shippingAddress: { postalCode: '28001', country: 'ES' } }), 0);
// Canarias
assert.strictEqual(determineTivpcl({ ...sampleOrder, shippingAddress: { postalCode: '35001', country: 'ES' } }), 3);
// Ceuta
assert.strictEqual(determineTivpcl({ ...sampleOrder, shippingAddress: { postalCode: '51001', country: 'ES' } }), 3);
// Melilla
assert.strictEqual(determineTivpcl({ ...sampleOrder, shippingAddress: { postalCode: '52001', country: 'ES' } }), 3);
// UE B2B con VIES
assert.strictEqual(
  determineTivpcl({
    ...sampleOrder,
    customer: { ...canonicalCust, taxId: 'FR123456789' },
    shippingAddress: { postalCode: '75001', country: 'FR' },
  }),
  2
);
// Exportación terceros países
assert.strictEqual(determineTivpcl({ ...sampleOrder, shippingAddress: { postalCode: '90210', country: 'US' } }), 3);

// 7. PENLPC, PIVLPC, TIVLPC, IVALPC and memo long description test
const lineLongDesc = {
  id: 'ln_long',
  position: 1,
  sku: 'VERYLONGSKU001',
  name: 'Nombre muy largo que supera los 50 caracteres para comprobar que se trunca correctamente en DESLPC',
  quantity: 5,
  unitPrice: 10,
  vatPercent: 21,
  vatType: 0,
  discountPercent: 0,
  subtotal: 50,
  total: 50,
};
const longLineSql = insertOrderLineQuery(lineLongDesc, 8801, '1');
// ARTLPC truncado a 13
assert(longLineSql.includes("'VERYLONGSKU00'"));
// PENLPC = CANLPC = 5.00
assert(longLineSql.includes('5.00'));
// IVALPC = 0 (21%) and MEMLPC contains full description
const normLineSql = longLineSql.replace(/\s+/g, ' ');
assert(normLineSql.includes(", 0, 'Nombre muy largo"));
// PIVLPC = 10 * 1.21 = 12.1000
assert(longLineSql.includes('12.1000'));
// TIVLPC = 50 * 1.21 = 60.50
assert(longLineSql.includes('60.50'));

// 8. Stock decrement query test
const stockDecSql = decrementStockQuery('000001', 'GEN', 3);
assert.strictEqual(stockDecSql, "UPDATE F_STO SET DISSTO = DISSTO - 3 WHERE ARTSTO = '000001' AND ALMSTO = 'GEN'");

// 9. Delivery address with F_OBR (no F_DCL)
const addrSql = insertDeliveryAddressQuery(105, 1, { country: 'ES', street: 'Calle Obra 1', city: 'Madrid', postalCode: '28001' }, 'Almacén');
assert(addrSql.includes('INSERT INTO F_OBR'), 'Must insert into F_OBR');
assert(!addrSql.includes('F_DCL'), 'Must NOT refer to F_DCL');

// 10. Truncate-then-Escape SQL Sanitization Tests
assert.strictEqual(sanitizeAndTruncate("O'Connor", 5), "O''Con", 'Truncate to 5 chars then escape quotes');
assert.strictEqual(sanitizeAndTruncate("O'Connor", 2), "O''", 'Truncate right after quote and escape safely');
assert.strictEqual(sanitizeAndTruncate("A'B'C'", 2), "A''", 'Truncate to 2 chars then escape quotes');
assert.strictEqual(sanitizeAndTruncate(null, 10), '', 'Null becomes empty string');
assert.strictEqual(sanitizeAndTruncate(undefined, 10), '', 'Undefined becomes empty string');
assert.strictEqual(sanitizeAndTruncate("Normal Text", 6), "Normal", 'Normal string truncate');

// 11. Atomic stock increment on order cancellation
const stockIncSql = incrementStockQuery('000001', 'GEN', 3);
assert.strictEqual(stockIncSql, "UPDATE F_STO SET DISSTO = DISSTO + 3 WHERE ARTSTO = '000001' AND ALMSTO = 'GEN'");

// 12. Fiscal test: Shipping imputation when order has NO 21% products (Preponderant 10%)
const order10Only: any = {
  id: 'order_10',
  orderNumber: '1001',
  date: new Date('2026-09-14'),
  status: 'pending',
  customer: { id: 'c1', fiscalName: 'Test Alimentos SL', hasEquivalenceSurcharge: false },
  lines: [
    {
      id: 'l1',
      position: 1,
      sku: 'FOOD1',
      name: 'Alimento 10%',
      quantity: 1,
      unitPrice: 50,
      vatPercent: 10,
      vatType: 1,
      discountPercent: 0,
      subtotal: 50,
      total: 50,
    },
  ],
  shippingAmount: 10,
  totalAmount: 66.0, // (50 + 10) * 1.10 = 66.00
  currency: 'EUR',
};

const bd10 = calculateOrderVatBreakdown(order10Only);
assert.strictEqual(bd10.net1, 0, 'No products at 21%');
assert.strictEqual(bd10.bas1, 0, 'BAS1 must be 0 when no 21% products');
assert.strictEqual(bd10.iiva1, 0, 'IIVA1 must be 0');
assert.strictEqual(bd10.net2, 50.0);
assert.strictEqual(bd10.bas2, 60.0, 'Portes imputados al tipo preponderante 10% (BAS2 = 50 + 10)');
assert.strictEqual(bd10.iiva2, 6.0, '60 * 0.10 = 6.00');
assert.strictEqual(bd10.total, 66.0, 'Total debe ser 66.00');

// 13. Fiscal test: Weighted deduction of order.discountAmount
const orderWithDiscount: any = {
  id: 'order_disc',
  orderNumber: '1002',
  date: new Date('2026-09-14'),
  status: 'pending',
  customer: { id: 'c1', fiscalName: 'Test SL', hasEquivalenceSurcharge: false },
  lines: [
    {
      id: 'l1',
      position: 1,
      sku: 'ITEM21',
      name: 'Item 21%',
      quantity: 1,
      unitPrice: 60,
      vatPercent: 21,
      vatType: 0,
      discountPercent: 0,
      subtotal: 60,
      total: 60,
    },
    {
      id: 'l2',
      position: 2,
      sku: 'ITEM10',
      name: 'Item 10%',
      quantity: 1,
      unitPrice: 40,
      vatPercent: 10,
      vatType: 1,
      discountPercent: 0,
      subtotal: 40,
      total: 40,
    },
  ],
  discountAmount: 20, // 20€ discount: 60% (12€) from 21%, 40% (8€) from 10%
  shippingAmount: 0,
  totalAmount: 93.28, // Net1: 48 * 1.21 = 58.08, Net2: 32 * 1.10 = 35.20 -> 93.28
  currency: 'EUR',
};

const bdDisc = calculateOrderVatBreakdown(orderWithDiscount);
assert.strictEqual(bdDisc.net1, 48.0, '60 - 12 = 48.00');
assert.strictEqual(bdDisc.net2, 32.0, '40 - 8 = 32.00');
assert.strictEqual(bdDisc.bas1, 48.0);
assert.strictEqual(bdDisc.bas2, 32.0);
assert.strictEqual(bdDisc.iiva1, 10.08); // 48 * 0.21
assert.strictEqual(bdDisc.iiva2, 3.20);  // 32 * 0.10
assert.strictEqual(bdDisc.total, 93.28, 'Factusol total concilia exactamente con total cobrado');

console.log('✓ Factusol Order Mapper Tests Passed');
