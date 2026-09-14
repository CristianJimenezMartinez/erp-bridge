import assert from 'assert';
import {
  mapCanonicalToWooCommerce,
  mapWooCommerceToCanonical,
} from '../src/mappers/woocommerce.mapper';
import { CanonicalProduct } from '@erp-bridge/shared';
import { WooCommerceProductHandler } from '../src/handlers/product.handler';
import { Logger } from '@erp-bridge/shared';

async function runWooCommerceTests() {
  console.log('--- Running WooCommerce Mapper & Handler Tests ---');

  const canonicalProduct: CanonicalProduct = {
    id: 'factusol_000047',
    sku: '000047',
    name: 'M. TUBO PVC ENC 16/160 MM.',
    description: 'Manguito tubo PVC para encolar alta resistencia',
    shortDescription: 'M. TUBO PVC',
    regularPrice: 25.50,
    costPrice: 17.85,
    stockQuantity: 15,
    manageStock: true,
    inStock: true,
    status: 'published',
    categories: [{ id: 'TUB', name: 'Tuberías y Accesorios' }],
    images: [{ url: 'https://example.com/img.jpg', alt: 'Tubo PVC' }],
    attributes: {},
  };

  // Test Canonical -> WooCommerce payload
  const wooPayload = mapCanonicalToWooCommerce(canonicalProduct);
  assert.strictEqual(wooPayload.sku, '000047');
  assert.strictEqual(wooPayload.name, 'M. TUBO PVC ENC 16/160 MM.');
  assert.strictEqual(wooPayload.regular_price, '25.5');
  assert.strictEqual(wooPayload.stock_quantity, 15);
  assert.strictEqual(wooPayload.status, 'publish');
  assert.strictEqual(wooPayload.categories?.[0]?.name, 'Tuberías y Accesorios');

  // Test WooCommerce -> Canonical Product
  const rawWooProduct = {
    id: 4589,
    sku: '000047',
    name: 'M. TUBO PVC ENC 16/160 MM.',
    regular_price: '25.50',
    stock_quantity: 15,
    manage_stock: true,
    status: 'publish',
    categories: [{ id: 12, name: 'Tuberías', slug: 'tuberias' }],
  };

  const backToCanonical = mapWooCommerceToCanonical(rawWooProduct);
  assert.strictEqual(backToCanonical.sku, '000047');
  assert.strictEqual(backToCanonical.regularPrice, 25.50);
  assert.strictEqual(backToCanonical.status, 'published');

  // Test WooCommerceProductHandler.readProducts pagination
  const requestedCalls: Array<{ endpoint: string; params: any }> = [];
  const mockClient: any = {
    get: async (endpoint: string, params: any) => {
      requestedCalls.push({ endpoint, params });
      if (params.page === 1) {
        return Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          sku: `SKU-${i + 1}`,
          name: `Product ${i + 1}`,
          regular_price: '10.0',
        }));
      } else if (params.page === 2) {
        return Array.from({ length: 100 }, (_, i) => ({
          id: 100 + i + 1,
          sku: `SKU-${100 + i + 1}`,
          name: `Product ${100 + i + 1}`,
          regular_price: '10.0',
        }));
      } else if (params.page === 3) {
        return Array.from({ length: 50 }, (_, i) => ({
          id: 200 + i + 1,
          sku: `SKU-${200 + i + 1}`,
          name: `Product ${200 + i + 1}`,
          regular_price: '10.0',
        }));
      }
      return [];
    },
  };

  const handler = new WooCommerceProductHandler(mockClient, new Logger('TestWoo'));
  
  // 1. Pagination across pages (>150 items: 250 total items)
  const products = await handler.readProducts();
  assert.strictEqual(products.length, 250, 'Should accumulate all 250 products across 3 pages');
  assert.strictEqual(requestedCalls.length, 3, 'Should have requested 3 pages');
  assert.strictEqual(requestedCalls[0]?.params.page, 1);
  assert.strictEqual(requestedCalls[1]?.params.page, 2);
  assert.strictEqual(requestedCalls[2]?.params.page, 3);
  assert.strictEqual(requestedCalls[0]?.params.per_page, 100);

  // 2. Pagination with limit > 150 items
  requestedCalls.length = 0;
  const limitedProducts = await handler.readProducts({ limit: 180 });
  assert.strictEqual(limitedProducts.length, 180, 'Should respect limit of 180 products');
  assert.strictEqual(requestedCalls.length, 2, 'Should have queried page 1 and page 2');

  // 3. ModifiedSince filter
  requestedCalls.length = 0;
  const testDate = new Date('2026-01-01T00:00:00Z');
  await handler.readProducts({ modifiedSince: testDate, limit: 10 });
  assert.strictEqual(requestedCalls[0]?.params.after, testDate.toISOString());

  console.log('✓ WooCommerce Mapper & Handler Tests Passed');
}

runWooCommerceTests().catch((err) => {
  console.error('❌ Error en test de WooCommerce:', err);
  process.exit(1);
});
