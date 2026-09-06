import assert from 'assert';
import {
  mapCanonicalToWooCommerce,
  mapWooCommerceToCanonical,
} from '../src/mappers/woocommerce.mapper';
import { CanonicalProduct } from '@erp-bridge/shared';

console.log('--- Running WooCommerce Mapper Tests ---');

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

console.log('✓ WooCommerce Mapper Tests Passed');
