import assert from 'assert';
import { WooCommerceOrderMapper, WooCommerceOrderRaw } from '../src/mappers/order.mapper';

console.log('--- Running WooCommerce Order Mapper Tests ---');

const mockWcOrder: WooCommerceOrderRaw = {
  id: 4567,
  number: '4567',
  status: 'processing',
  currency: 'EUR',
  date_created: '2026-08-24T10:15:30',
  total: '121.00',
  total_tax: '21.00',
  shipping_total: '0.00',
  discount_total: '0.00',
  customer_id: 89,
  billing: {
    first_name: 'Carlos',
    last_name: 'Martínez',
    company: 'Construcciones Martínez',
    address_1: 'Calle Industria 12',
    city: 'Sevilla',
    state: 'Sevilla',
    postcode: '41001',
    country: 'ES',
    email: 'carlos@cmartinez.es',
    phone: '600112233',
  },
  shipping: {
    first_name: 'Carlos',
    last_name: 'Martínez',
    address_1: 'Calle Industria 12',
    city: 'Sevilla',
    postcode: '41001',
    country: 'ES',
  },
  payment_method: 'redsys',
  payment_method_title: 'Tarjeta de crédito / Débito',
  line_items: [
    {
      id: 101,
      name: 'Tubo PVC Presión 90mm',
      product_id: 204,
      quantity: 20,
      sku: '000004',
      price: 5.0,
      subtotal: '100.00',
      subtotal_tax: '21.00',
      total: '100.00',
      total_tax: '21.00',
    },
  ],
  meta_data: [
    { id: 1, key: '_billing_nif', value: 'B99887766' },
  ],
};

const canonicalOrder = WooCommerceOrderMapper.toCanonicalOrder(mockWcOrder);

assert.strictEqual(canonicalOrder.orderNumber, '4567');
assert.strictEqual(canonicalOrder.reference, '4567');
assert.strictEqual(canonicalOrder.status, 'processing');
assert.strictEqual(canonicalOrder.customer.fiscalName, 'Construcciones Martínez');
assert.strictEqual(canonicalOrder.customer.taxId, 'B99887766');
assert.strictEqual(canonicalOrder.customer.email, 'carlos@cmartinez.es');
assert.strictEqual(canonicalOrder.lines.length, 1);
assert.strictEqual(canonicalOrder.lines[0]?.sku, '000004');
assert.strictEqual(canonicalOrder.lines[0]?.quantity, 20);
assert.strictEqual(canonicalOrder.totalAmount, 121.0);

console.log('✓ WooCommerce Order Mapper Tests Passed');
