import assert from 'assert';
import { FactusolOrderMapper } from '../src/mappers/order.mapper';
import {
  insertCustomerQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
} from '../src/queries/order.queries';
import { CanonicalOrder } from '@erp-bridge/shared';

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
const sampleOrder: CanonicalOrder = {
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

const headerSql = insertOrderHeaderQuery(sampleOrder, 9901, 105);
assert(headerSql.includes('INSERT INTO F_PCL'));
assert(headerSql.includes("'1'"));
assert(headerSql.includes('9901'));
assert(headerSql.includes("'WC-9901'"));

const lineSql = insertOrderLineQuery(sampleOrder.lines[0]!, 9901, '1');
assert(lineSql.includes('INSERT INTO F_LPC'));
assert(lineSql.includes('9901'));
assert(lineSql.includes("'000001'"));

console.log('✓ Factusol Order Mapper Tests Passed');
