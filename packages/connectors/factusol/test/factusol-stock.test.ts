import assert from 'assert';
import { FactusolStockMapper } from '../src/mappers/stock.mapper';
import { readStockBySkusQuery, readStockQuery } from '../src/queries/stock.queries';

import { FACTUSOL_QUERIES } from '../src/queries/article.queries';

console.log('--- Running Factusol Stock Mapper & Queries Tests ---');

// 1. Test Query Generation
const allStockQuery = readStockQuery({ warehouse: 'GEN', limit: 100 });
assert(allStockQuery.includes('SELECT TOP 100'));
assert(allStockQuery.includes('FROM F_STO'));
assert(allStockQuery.includes("WHERE ALMSTO = 'GEN'"));

const skuStockQuery = readStockBySkusQuery(['000001', '000002'], 'GEN');
assert(skuStockQuery.includes("ARTSTO IN ('000001', '000002')"));
assert(skuStockQuery.includes("ALMSTO = 'GEN'"));

// Test article.queries getStock & getPrices
const generalStockQuery = FACTUSOL_QUERIES.getStock();
assert(!generalStockQuery.includes('WHERE'), 'General getStock should not have WHERE clause');

const filteredStockQuery = FACTUSOL_QUERIES.getStock(['A001', 'B002']);
assert(filteredStockQuery.includes("WHERE ARTSTO IN ('A001', 'B002')"), 'Filtered getStock must include WHERE ARTSTO IN');

const numericPriceQuery = FACTUSOL_QUERIES.getPrices('1');
assert(numericPriceQuery.includes("(TARLTA = 1 OR CStr(TARLTA) = '1')"), 'Numeric tariff must include dual format');

const alphaPriceQuery = FACTUSOL_QUERIES.getPrices('WEB', ['A001', 'B002']);
assert(alphaPriceQuery.includes("CStr(TARLTA) = 'WEB'"), 'Alphanumeric tariff must use CStr');
assert(alphaPriceQuery.includes("AND ARTLTA IN ('A001', 'B002')"), 'Tariff query must include SKU filter');

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
