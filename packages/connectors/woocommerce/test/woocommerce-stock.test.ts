import assert from 'assert';
import { WooCommerceStockMapper } from '../src/mappers/stock.mapper';
import { CanonicalStock } from '@erp-bridge/shared';

console.log('--- Running WooCommerce Stock Mapper Tests ---');

const canonicalStock: CanonicalStock = {
  sku: '000001',
  quantity: 42,
  warehouse: 'GEN',
  lastUpdated: new Date(),
};

const payload = WooCommerceStockMapper.mapToPayload(canonicalStock, 987);

assert.strictEqual(payload.id, 987);
assert.strictEqual(payload.manage_stock, true);
assert.strictEqual(payload.stock_quantity, 42);
assert.strictEqual(payload.in_stock, true);

// Test 0 quantity
const zeroStock: CanonicalStock = {
  sku: '000002',
  quantity: 0,
  warehouse: 'GEN',
  lastUpdated: new Date(),
};

const zeroPayload = WooCommerceStockMapper.mapToPayload(zeroStock, 988);
assert.strictEqual(zeroPayload.stock_quantity, 0);
assert.strictEqual(zeroPayload.in_stock, false);

console.log('✓ WooCommerce Stock Mapper Tests Passed');
