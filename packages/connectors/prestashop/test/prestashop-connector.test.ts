import assert from 'assert';
import { PrestaShopConnector } from '../src/prestashop.connector';
import { StockMappingCache } from '../src/handlers/stock-cache';

console.log('--- Running PrestaShop Connector & Cache Tests ---');

// 1. Connector Metadata & Capabilities
const connector = new PrestaShopConnector();
const metadata = connector.getMetadata();
assert.strictEqual(metadata.id, 'connector-prestashop');
assert.strictEqual(metadata.name, 'PrestaShop');
assert.strictEqual(metadata.slug, 'prestashop');
assert.strictEqual(metadata.version, '0.1.0');
console.log('✓ Metadata check passed');

const capabilities = connector.getCapabilities();
assert.strictEqual(capabilities.supportsReadProducts, true);
assert.strictEqual(capabilities.supportsWriteProducts, true);
assert.strictEqual(capabilities.supportsReadStock, true);
assert.strictEqual(capabilities.supportsWriteStock, true);
assert.strictEqual(capabilities.supportsReadOrders, true);
assert.strictEqual(capabilities.supportsWriteOrders, true);
assert.strictEqual(capabilities.supportsReadCustomers, true);
assert.strictEqual(capabilities.supportsWriteCustomers, true);
assert.strictEqual(capabilities.supportsBatchOperations, true);
console.log('✓ Capabilities check passed');

// 2. StockMappingCache
const cache = new StockMappingCache();
cache.set({
  sku: 'REF-M-AZUL',
  idProduct: 120,
  idProductAttribute: 450,
  idStockAvailable: 890,
});

assert.strictEqual(cache.has('REF-M-AZUL'), true);
assert.strictEqual(cache.has('ref-m-azul'), true); // case insensitive check
const entry = cache.getBySku('ref-m-azul');
assert.strictEqual(entry?.idStockAvailable, 890);
assert.strictEqual(entry?.idProduct, 120);
assert.strictEqual(entry?.idProductAttribute, 450);

const byAttr = cache.getByProductAttr(120, 450);
assert.strictEqual(byAttr?.sku, 'REF-M-AZUL');
assert.strictEqual(cache.size(), 1);

cache.clear();
assert.strictEqual(cache.size(), 0);
assert.strictEqual(cache.has('REF-M-AZUL'), false);
console.log('✓ StockMappingCache passed');

console.log('ALL PRESTASHOP CONNECTOR TESTS PASSED SUCCESSFULLY');
