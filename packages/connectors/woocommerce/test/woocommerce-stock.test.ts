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

// Test overselling prevention: availableQuantity takes precedence over physical quantity
const oversellProtectedStock: CanonicalStock = {
  sku: '000003',
  quantity: 50, // Physical stock (ACTSTO)
  availableQuantity: 12, // Available stock after reservations (DISSTO)
  warehouse: 'GEN',
  lastUpdated: new Date(),
};

const protectedPayload = WooCommerceStockMapper.mapToPayload(oversellProtectedStock, 989);
assert.strictEqual(protectedPayload.stock_quantity, 12, 'Must use availableQuantity to prevent overselling');
assert.strictEqual(protectedPayload.in_stock, true);

// Test negative available stock clamped to 0
const negativeStock: CanonicalStock = {
  sku: '000004',
  quantity: 5,
  availableQuantity: -3, // Oversold in ERP
  warehouse: 'GEN',
  lastUpdated: new Date(),
};

const negativePayload = WooCommerceStockMapper.mapToPayload(negativeStock, 990);
assert.strictEqual(negativePayload.stock_quantity, 0, 'Negative stock must be clamped to 0');
assert.strictEqual(negativePayload.in_stock, false);

console.log('✓ WooCommerce Stock Mapper Tests Passed');

