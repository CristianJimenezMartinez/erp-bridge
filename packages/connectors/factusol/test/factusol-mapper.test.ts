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
};

const stockMap = buildStockMap([{ ARTSTO: '000047', ALMSTO: 'GEN', ACTSTO: 15, DISSTO: 15 }]);
const priceMap = buildPriceMap([{ TARLTA: '1', ARTLTA: '000047', PRELTA: 25.50 }]);
const familyMap = buildFamilyMap([{ CODFAM: 'TUB', DESFAM: 'Tuberías y Accesorios' }]);

const canonical = mapFactusolArticleToCanonical(rawArticle, { stockMap, priceMap, familyMap });

assert.strictEqual(canonical.sku, '000047');
assert.strictEqual(canonical.name, 'M. TUBO PVC ENC 16/160 MM.');
assert.strictEqual(canonical.regularPrice, 25.50); // From tariff 1
assert.strictEqual(canonical.costPrice, 17.85);
assert.strictEqual(canonical.stockQuantity, 15);
assert.strictEqual(canonical.status, 'published');
assert.strictEqual(canonical.categories[0]?.name, 'Tuberías y Accesorios');
assert.strictEqual(canonical.barcode, '8435123456789');

console.log('✓ Factusol Mapper Tests Passed');
