import assert from 'assert';
import {
  CanonicalCustomerSchema,
  CanonicalOrderSchema,
} from '../src/canonical/order';

console.log('--- Running Shared Canonical Order Tests ---');

// 1. Validate Customer Schema
const validCustomer = CanonicalCustomerSchema.parse({
  id: 'cust_001',
  fiscalName: 'Empresa Demo SL',
  commercialName: 'Demo Shop',
  taxId: 'B12345678',
  email: 'contacto@empresademo.com',
  phone: '912345678',
  address: {
    street: 'Calle Mayor 10',
    city: 'Madrid',
    state: 'Madrid',
    postalCode: '28001',
    country: 'ES',
  },
});

assert.strictEqual(validCustomer.fiscalName, 'Empresa Demo SL');
assert.strictEqual(validCustomer.taxId, 'B12345678');

// 2. Validate Order Schema
const validOrder = CanonicalOrderSchema.parse({
  id: 'order_1001',
  orderNumber: '1001',
  reference: 'WC-1001',
  date: new Date(),
  status: 'processing',
  customer: validCustomer,
  lines: [
    {
      id: 'line_1',
      position: 1,
      sku: 'ART-001',
      name: 'Tubo PVC 50mm',
      quantity: 5,
      unitPrice: 10.0,
      subtotal: 50.0,
      total: 50.0,
    },
  ],
  netAmount: 50.0,
  taxAmount: 10.5,
  totalAmount: 60.5,
});

assert.strictEqual(validOrder.orderNumber, '1001');
assert.strictEqual(validOrder.lines.length, 1);
assert.strictEqual(validOrder.totalAmount, 60.5);

console.log('✓ Shared Canonical Order Tests Passed');
