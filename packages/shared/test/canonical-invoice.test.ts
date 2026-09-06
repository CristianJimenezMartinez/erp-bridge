import assert from 'assert';
import {
  CanonicalInvoice,
  CanonicalInvoiceSchema,
} from '../src/canonical/invoice';

console.log('--- Running Shared Canonical Invoice Tests ---');

const sampleInvoice: CanonicalInvoice = {
  id: 'inv_1001',
  series: '1',
  invoiceNumber: '1001',
  orderReference: 'WC-5050',
  issueDate: new Date('2026-08-24'),
  status: 'issued',
  customer: {
    customerCode: '10008',
    name: 'EMPRESA CLIENTE TEST S.L.',
    taxId: 'B12345678',
    email: 'facturacion@clientetest.es',
    billingAddress: {
      street: 'Poligono Industrial Nave 12',
      city: 'Madrid',
      postalCode: '28001',
      province: 'Madrid',
      country: 'ES',
    },
  },
  lines: [
    {
      position: 1,
      sku: '000001',
      description: 'M. TUBO PVC ENC 8/ 50 MM.',
      quantity: 10,
      unitPrice: 1.92,
      discountPercent: 0,
      taxRate: 21,
      taxAmount: 4.03,
      lineTotal: 19.2,
    },
  ],
  shippingCost: 5.0,
  netAmount: 24.2,
  taxAmount: 5.08,
  taxBreakdown: [
    {
      rate: 21,
      baseAmount: 24.2,
      taxAmount: 5.08,
    },
  ],
  totalAmount: 29.28,
  currency: 'EUR',
};

const parsed = CanonicalInvoiceSchema.parse(sampleInvoice);
assert.strictEqual(parsed.invoiceNumber, '1001');
assert.strictEqual(parsed.series, '1');
assert.strictEqual(parsed.lines.length, 1);
assert.strictEqual(parsed.totalAmount, 29.28);
assert.strictEqual(parsed.customer.name, 'EMPRESA CLIENTE TEST S.L.');

console.log('✓ Shared Canonical Invoice Tests Passed');
