import assert from 'assert';
import { InvoiceSyncEngine } from '../src/engine/invoice-sync.engine';
import { CanonicalOrder } from '@erp-bridge/shared';

console.log('--- Running Core InvoiceSyncEngine Tests ---');

const engine = new InvoiceSyncEngine();

const sampleOrder: CanonicalOrder = {
  id: 'order_wc_8899',
  orderNumber: '8899',
  series: '1',
  reference: 'REF-8899',
  date: new Date('2026-08-24'),
  status: 'processing',
  customer: {
    id: 'cust_01',
    customerNumber: '10008',
    fiscalName: 'CLIENTE MOTOR SL',
    taxId: 'B12345678',
    email: 'contacto@motor.es',
    phone: '912345678',
  },
  billingAddress: {
    street: 'Gran Via 28',
    city: 'Madrid',
    postalCode: '28013',
    state: 'Madrid',
    country: 'ES',
  },
  lines: [
    {
      id: 'item_1',
      position: 1,
      sku: '000001',
      name: 'M. TUBO PVC ENC 8/ 50 MM.',
      quantity: 10,
      unitPrice: 2.0,
      subtotal: 20.0,
      total: 24.2,
      discountPercent: 0,
      vatPercent: 21,
      vatType: 0,
    },
    {
      id: 'item_2',
      position: 2,
      sku: '000002',
      name: 'M. TUBO PVC ENC 6/ 63 MM.',
      quantity: 5,
      unitPrice: 10.0,
      subtotal: 50.0,
      total: 55.0,
      discountPercent: 0,
      vatPercent: 10,
      vatType: 1,
    },
  ],
  netAmount: 70.0,
  taxAmount: 9.2,
  shippingAmount: 5.0,
  discountAmount: 0,
  totalAmount: 84.2,
  currency: 'EUR',
  warehouse: 'GEN',
};

// 1. Test orderToInvoice conversion & tax breakdown
const invoice = engine.orderToInvoice(sampleOrder, '1');

assert.strictEqual(invoice.id, 'inv_order_wc_8899');
assert.strictEqual(invoice.series, '1');
assert.strictEqual(invoice.orderReference, 'REF-8899');
assert.strictEqual(invoice.customer.name, 'CLIENTE MOTOR SL');
assert.strictEqual(invoice.customer.customerCode, '10008');
assert.strictEqual(invoice.netAmount, 70.0);
assert.strictEqual(invoice.shippingCost, 5.0);
assert.strictEqual(invoice.totalAmount, 84.2);
assert.strictEqual(invoice.lines.length, 2);

// Verify Tax breakdown contains both 21% and 10%
const vat21 = invoice.taxBreakdown.find((t) => t.rate === 21);
const vat10 = invoice.taxBreakdown.find((t) => t.rate === 10);
assert(vat21, 'Debe incluir desglose de IVA 21%');
assert.strictEqual(vat21.baseAmount, 20.0);
assert.strictEqual(vat21.taxAmount, 4.2);

assert(vat10, 'Debe incluir desglose de IVA 10%');
assert.strictEqual(vat10.baseAmount, 50.0);
assert.strictEqual(vat10.taxAmount, 5.0);

console.log('✓ Core InvoiceSyncEngine Tests Passed');
