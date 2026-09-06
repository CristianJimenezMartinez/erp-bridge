import assert from 'assert';
import { CanonicalStockSchema } from '../src/canonical/stock';

console.log('--- Running Shared Canonical Stock Tests ---');

// 1. Validate Stock Schema
const validStock = CanonicalStockSchema.parse({
  sku: '000001',
  quantity: 25.5,
  availableQuantity: 20.0,
  warehouse: 'GEN',
  minStock: 5.0,
});

assert.strictEqual(validStock.sku, '000001');
assert.strictEqual(validStock.quantity, 25.5);
assert.strictEqual(validStock.availableQuantity, 20.0);
assert.strictEqual(validStock.warehouse, 'GEN');
assert.strictEqual(validStock.minStock, 5.0);

console.log('✓ Shared Canonical Stock Tests Passed');
