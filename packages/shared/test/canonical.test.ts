import assert from 'assert';
import { CanonicalProductSchema } from '../src/canonical/product';

console.log('--- Running Shared Canonical Tests ---');

// Valid product
const validProduct = {
  id: 'prod_1',
  sku: 'SKU-001',
  name: 'Tubo PVC 160mm',
  regularPrice: 24.50,
  stockQuantity: 12,
  manageStock: true,
  inStock: true,
  status: 'published' as const,
  categories: [{ id: 'fam_1', name: 'Tuberías', slug: 'tuberias' }],
  attributes: { material: 'PVC' },
  images: [{ url: 'https://example.com/img1.jpg' }],
};

const parsed = CanonicalProductSchema.parse(validProduct);
assert.strictEqual(parsed.sku, 'SKU-001');
assert.strictEqual(parsed.regularPrice, 24.50);
assert.strictEqual(parsed.status, 'published');

// Invalid product (negative price)
try {
  CanonicalProductSchema.parse({
    ...validProduct,
    regularPrice: -10,
  });
  assert.fail('Should have failed on negative price');
} catch (e: any) {
  assert(e.errors, 'Zod caught validation error');
}

console.log('✓ Shared Canonical Tests Passed');
