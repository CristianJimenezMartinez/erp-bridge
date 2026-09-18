import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FactusolImageLocator } from '../src/images/factusol-image.locator';

console.log('--- Running FactusolImageLocator Tests ---');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'factusol-img-test-'));
const fotosDir = path.join(tmpDir, 'Fotos', 'BOMBAS');
fs.mkdirSync(fotosDir, { recursive: true });

const testImgFile = path.join(fotosDir, 'bomba-centrifuga.jpg');
fs.writeFileSync(testImgFile, 'fake-image-content-12345');

try {
  const fakeDbPath = path.join(tmpDir, 'Datos', 'FS', '2252025.accdb');
  fs.mkdirSync(path.dirname(fakeDbPath), { recursive: true });
  fs.writeFileSync(fakeDbPath, 'fake-db');

  const locator = new FactusolImageLocator(fakeDbPath, path.join(tmpDir, 'Fotos'));

  console.log('1. Testing empty / null image paths...');
  const emptyRes = locator.resolveImage('ART001', null);
  assert.strictEqual(emptyRes.exists, false);
  assert.strictEqual(emptyRes.localPath, null);
  assert.strictEqual(emptyRes.relativeWebPath, '');

  console.log('2. Testing relative path with FOTOS\\...');
  const res1 = locator.resolveImage('ART002', 'FOTOS\\BOMBAS\\bomba-centrifuga.jpg');
  assert.strictEqual(res1.exists, true);
  assert.strictEqual(res1.relativeWebPath, 'FOTOS/BOMBAS/bomba-centrifuga.jpg');
  assert.strictEqual(res1.filename, 'bomba-centrifuga.jpg');
  assert.strictEqual(res1.sizeBytes, 24);

  console.log('3. Testing path without FOTOS prefix...');
  const res2 = locator.resolveImage('ART003', 'BOMBAS\\bomba-centrifuga.jpg');
  assert.strictEqual(res2.exists, true);
  assert.strictEqual(res2.relativeWebPath, 'FOTOS/BOMBAS/bomba-centrifuga.jpg');

  console.log('4. Testing absolute path directly on disk...');
  const res3 = locator.resolveImage('ART004', testImgFile);
  assert.strictEqual(res3.exists, true);
  assert.strictEqual(res3.localPath, path.resolve(testImgFile));

  console.log('5. Testing non-existent image...');
  const res4 = locator.resolveImage('ART005', 'FOTOS\\NO_EXISTE\\no_esta.jpg');
  assert.strictEqual(res4.exists, false);
  assert.strictEqual(res4.localPath, null);

  console.log('6. Testing batch resolution...');
  const batch = locator.resolveBatch([
    { sku: 'ART002', imgart: 'FOTOS\\BOMBAS\\bomba-centrifuga.jpg' },
    { sku: 'ART005', imgart: 'FOTOS\\NO_EXISTE\\no_esta.jpg' },
  ]);
  assert.strictEqual(batch.size, 2);
  assert.strictEqual(batch.get('ART002')?.exists, true);
  assert.strictEqual(batch.get('ART005')?.exists, false);

  console.log('✓ All FactusolImageLocator tests passed successfully!');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
