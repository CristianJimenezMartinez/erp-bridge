import assert from 'assert';
import { FactusolDetector } from '../src/detector';

console.log('--- Running Agent FactusolDetector Tests ---');

// 1. Test filename parsing
const parseFn = (FactusolDetector as any).parseFileName.bind(FactusolDetector);

const res1 = parseFn('2252025.accdb');
assert.strictEqual(res1.companyCode, '225');
assert.strictEqual(res1.year, '2025');

const res2 = parseFn('0022024.mdb');
assert.strictEqual(res2.companyCode, '002');
assert.strictEqual(res2.year, '2024');

const res3 = parseFn('FS2026.accdb');
assert.strictEqual(res3.companyCode, 'FS');
assert.strictEqual(res3.year, '2026');

// 2. Test detection on real project candidate path
const detected = FactusolDetector.detectAll(['D:\\Proyectos\\Bentian\\API\\bentian']);
console.log(`Detectadas ${detected.length} instancias de Factusol en D:\\Proyectos\\Bentian\\API\\bentian`);
if (detected.length > 0) {
  assert(detected[0]!.databasePath.endsWith('.accdb'));
  assert(detected[0]!.fileSizeBytes > 0);
  assert.strictEqual(detected[0]!.isValid, true);
}

console.log('✓ Agent FactusolDetector Tests Passed');
