import assert from 'assert';
import { FactusolStockMapper } from '../src/mappers/stock.mapper';
import { readStockBySkusQuery, readStockQuery } from '../src/queries/stock.queries';

console.log('--- Running Factusol Stock Mapper & Queries Tests ---');

// 1. Test Query Generation
const allStockQuery = readStockQuery({ warehouse: 'GEN', limit: 100 });
assert(allStockQuery.includes('SELECT TOP 100'));
assert(allStockQuery.includes('FROM F_STO'));
assert(allStockQuery.includes("WHERE ALMSTO = 'GEN'"));

const skuStockQuery = readStockBySkusQuery(['000001', '000002'], 'GEN');
assert(skuStockQuery.includes("ARTSTO IN ('000001', '000002')"));
assert(skuStockQuery.includes("ALMSTO = 'GEN'"));

// 2. Test Stock Mapper
const canonical = FactusolStockMapper.toCanonicalStock({
  ARTSTO: '000004',
  ALMSTO: 'GEN',
  ACTSTO: 15.0,
  MINSTO: 2.0,
  DISSTO: 13.0,
});

assert.strictEqual(canonical.sku, '000004');
assert.strictEqual(canonical.warehouse, 'GEN');
assert.strictEqual(canonical.quantity, 15.0);
assert.strictEqual(canonical.availableQuantity, 13.0);
assert.strictEqual(canonical.minStock, 2.0);

console.log('✓ Factusol Stock Mapper & Queries Tests Passed');
