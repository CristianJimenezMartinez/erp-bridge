import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageSyncService } from '../src/sync/image-sync.service';
import { CanonicalProduct } from '@erp-bridge/shared';

async function run() {
  console.log('--- Running ImageSyncService Tests ---');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-sync-test-'));
  const photosDir = path.join(tmpDir, 'Fotos', 'BOMBAS');
  fs.mkdirSync(photosDir, { recursive: true });

  const fakeImgPath = path.join(photosDir, 'bomba-sumergible.jpg');
  fs.writeFileSync(fakeImgPath, 'fake-jpeg-binary-stream-1234567890');

  // Crear servidor HTTP mock que simule erp-bridge-endpoint.php
  const uploadedFiles: Record<string, string> = {};
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const action = url.searchParams.get('action');
    const auth = req.headers['authorization'];

    if (auth !== 'Bearer test_secret_123') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (action === 'check_images') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body || '{}');
      const images = data.images || [];

      // Marcamos que la imagen está ausente (missing)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          totalChecked: images.length,
          existingCount: 0,
          missingCount: images.length,
          missing: images.map((i: any) => i.path),
        })
      );
      return;
    }

    if (action === 'upload_image') {
      const relPath = url.searchParams.get('path') || (req.headers['x-file-path'] as string);
      const sku = url.searchParams.get('sku') || (req.headers['x-product-sku'] as string);
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const fileBuffer = Buffer.concat(chunks);
      uploadedFiles[relPath] = fileBuffer.toString('utf-8');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          path: relPath,
          sku,
          bytesWritten: fileBuffer.length,
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const endpointUrl = `http://127.0.0.1:${port}/erp-bridge-endpoint.php`;

  try {
    const service = new ImageSyncService({
      endpointUrl,
      secretKey: 'test_secret_123',
      databasePath: path.join(tmpDir, '2252025.accdb'),
      customPhotosPath: path.join(tmpDir, 'Fotos'),
      concurrency: 2,
    });

    // 1. Test con catálogo sin fotos
    console.log('1. Testing catalog without images...');
    const emptyProducts: CanonicalProduct[] = [
      {
        id: 'p1',
        sku: 'ART001',
        name: 'Sin foto',
        regularPrice: 10,
        costPrice: 5,
        stockQuantity: 10,
        manageStock: true,
        inStock: true,
        status: 'published',
        categories: [],
        images: [],
        attributes: {},
      },
    ];
    const repEmpty = await service.syncImages(emptyProducts);
    assert.strictEqual(repEmpty.totalArticlesWithImages, 0);
    assert.strictEqual(repEmpty.uploadedCount, 0);

    // 2. Test con producto con foto existente en disco local
    console.log('2. Testing product with local photo...');
    const productsWithImages: CanonicalProduct[] = [
      {
        id: 'p2',
        sku: 'BOMB001',
        name: 'Bomba Sumergible',
        regularPrice: 150,
        costPrice: 90,
        stockQuantity: 4,
        manageStock: true,
        inStock: true,
        status: 'published',
        categories: [],
        images: [{ url: 'FOTOS\\BOMBAS\\bomba-sumergible.jpg' }],
        attributes: {
          imgart: 'FOTOS\\BOMBAS\\bomba-sumergible.jpg',
        },
      },
    ];

    const rep = await service.syncImages(productsWithImages);
    assert.strictEqual(rep.totalArticlesWithImages, 1);
    assert.strictEqual(rep.totalUniqueImages, 1);
    assert.strictEqual(rep.missingOnServer, 1);
    assert.strictEqual(rep.uploadedCount, 1);
    assert.strictEqual(rep.failedCount, 0);

    // Verificar que el servidor recibió el contenido binario exacto
    assert(
      uploadedFiles['FOTOS/BOMBAS/bomba-sumergible.jpg'],
      'Server must have received uploaded file'
    );
    assert.strictEqual(
      uploadedFiles['FOTOS/BOMBAS/bomba-sumergible.jpg'],
      'fake-jpeg-binary-stream-1234567890'
    );

    console.log('✓ All ImageSyncService tests passed successfully!');
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('ImageSyncService test failure:', err);
  process.exit(1);
});
