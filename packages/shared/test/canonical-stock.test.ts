import assert from 'assert';
import { CanonicalStockSchema, CanonicalStockUpdateSchema } from '../src/canonical/stock';

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

// 2. Validate Stock Update Schema (DISSTO / availableStock)
const validStockUpdate = CanonicalStockUpdateSchema.parse({
  sku: 'ART-001',
  barcode: '8412345678901',
  availableStock: 42.5,
  physicalStock: 50.0,
  committedStock: 7.5,
  warehouse: 'GEN',
});

assert.strictEqual(validStockUpdate.sku, 'ART-001');
assert.strictEqual(validStockUpdate.barcode, '8412345678901');
assert.strictEqual(validStockUpdate.availableStock, 42.5);
assert.strictEqual(validStockUpdate.physicalStock, 50.0);
assert.strictEqual(validStockUpdate.committedStock, 7.5);
assert.strictEqual(validStockUpdate.warehouse, 'GEN');

console.log('✓ Shared Canonical Stock Tests Passed');
