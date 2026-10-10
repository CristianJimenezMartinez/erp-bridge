import assert from 'assert';
import { BRAND_CONFIG, getBrandConfig } from '../src/brand';

console.log('--- Running Shared Brand Config Tests ---');

// 1. Valores por defecto compatibles 100% con Bentian
assert.strictEqual(BRAND_CONFIG.brandName, 'Bentian');
assert.strictEqual(BRAND_CONFIG.brandAppId, 'Bentian.ERPBridge');
assert.strictEqual(BRAND_CONFIG.brandDataFolder, 'Bentian Agent');
assert.strictEqual(BRAND_CONFIG.brandPort, 39281);
assert.strictEqual(BRAND_CONFIG.cloudUrl, 'https://bridge.cristianjm.com');

// 2. Comprobar que getBrandConfig() devuelve los valores esperados
const config = getBrandConfig();
assert.strictEqual(config.brandName, 'Bentian');
assert.strictEqual(config.brandPort, 39281);

// 3. Inmutabilidad del puerto canónico
assert.strictEqual(config.brandPort, 39281);

console.log('✓ Shared Brand Config Tests Passed');
