import assert from 'assert';
import {
  buildFamilyMap,
  buildPriceMap,
  buildStockMap,
  mapFactusolArticleToCanonical,
} from '../src/mappers/factusol.mapper';
import { FactusolRawArticle } from '../src/queries/article.queries';

console.log('--- Running Factusol Mapper Tests ---');

const rawArticle: FactusolRawArticle = {
  CODART: '000047',
  DESART: 'M. TUBO PVC ENC 16/160 MM.',
  DEWART: 'MANGUITO TUBO PVC ENCOLAR',
  EANART: '8435123456789',
  FAMART: 'TUB',
  PCOART: 17.85,
  SUWART: '1',
  IMGART: '000047.jpg',
  UUMART: 'UD',
  TIVART: 0,
  STOART: '1',
  PESART: 2.5,
};

const stockMap = buildStockMap([{ ARTSTO: '000047', ALMSTO: 'GEN', ACTSTO: 15, DISSTO: 12 }]);
const priceMap = buildPriceMap([{ TARLTA: '1', ARTLTA: '000047', PRELTA: 25.50 }]);
const familyMap = buildFamilyMap([{ CODFAM: 'TUB', DESFAM: 'Tuberías y Accesorios' }]);
const barcodeMap = new Map<string, string[]>([['000047', ['8435999999999', '8435888888888']]]);

const canonical = mapFactusolArticleToCanonical(rawArticle, { stockMap, priceMap, familyMap, barcodeMap });

assert.strictEqual(canonical.sku, '000047');
assert.strictEqual(canonical.name, 'M. TUBO PVC ENC 16/160 MM.');
assert.strictEqual(canonical.regularPrice, 25.50); // From tariff 1
assert.strictEqual(canonical.costPrice, 17.85);
assert.strictEqual(canonical.stockQuantity, 12, 'Available stock (DISSTO) must be used');
assert.strictEqual(canonical.status, 'published');
assert.strictEqual(canonical.categories[0]?.name, 'Tuberías y Accesorios');
assert.strictEqual(canonical.barcode, '8435123456789');
assert.deepStrictEqual(canonical.barcodes, ['8435123456789', '8435999999999', '8435888888888'], 'Must merge EANART with F_EAN');
assert.strictEqual(canonical.taxRate, 21.0, 'TIVART 0 must map to 21%');

// Test all TIVART tax brackets
import { mapTivartToTaxRate, FactusolStockMapper } from '../src/mappers';

assert.strictEqual(mapTivartToTaxRate(0), 21.0);
assert.strictEqual(mapTivartToTaxRate(1), 10.0);
assert.strictEqual(mapTivartToTaxRate(2), 4.0);
assert.strictEqual(mapTivartToTaxRate(3), 0.0);

// Test CanonicalStock <-> FactusolStockRaw (ACTSTO <-> quantity, DISSTO <-> availableQuantity)
const factusolStockRaw = {
  ARTSTO: 'SKU-TEST',
  ALMSTO: 'GEN',
  ACTSTO: 100, // Physical stock
  DISSTO: 85,  // Available stock
  MINSTO: 10,
};

const canonicalStock = FactusolStockMapper.toCanonicalStock(factusolStockRaw);
assert.strictEqual(canonicalStock.quantity, 100, 'quantity must map to ACTSTO');
assert.strictEqual(canonicalStock.availableQuantity, 85, 'availableQuantity must map to DISSTO');

const backToFactusol = FactusolStockMapper.toFactusolStock(canonicalStock);
assert.strictEqual(backToFactusol.ACTSTO, 100, 'ACTSTO must map to quantity');
assert.strictEqual(backToFactusol.DISSTO, 85, 'DISSTO must map to availableQuantity');

console.log('✓ Factusol Mapper Tests Passed');

