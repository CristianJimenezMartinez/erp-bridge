import assert from 'assert';
import { MappingEngine } from '../src/mapping/mapping.engine';
import { CanonicalProduct } from '@erp-bridge/shared';

console.log('--- Running Core Mapping Engine Tests ---');

const engine = new MappingEngine();

const sampleProduct: CanonicalProduct = {
  id: 'fact_001',
  sku: 'art-001',
  name: '  Tornillo Acero Inox  ',
  regularPrice: 10.00,
  stockQuantity: 5,
  manageStock: true,
  inStock: true,
  status: 'published',
  categories: [],
  images: [],
  attributes: {},
};

// Test transformation mappings
const mappings = [
  {
    id: 'm1',
    syncJobId: 'job_1',
    sourceField: 'sku',
    destinationField: 'sku',
    transformation: 'uppercase',
  },
  {
    id: 'm2',
    syncJobId: 'job_1',
    sourceField: 'name',
    destinationField: 'name',
    transformation: 'trim',
  },
  {
    id: 'm3',
    syncJobId: 'job_1',
    sourceField: 'regularPrice',
    destinationField: 'regularPrice',
    transformation: 'multiply:1.21', // 21% IVA markup
  },
];

const transformed = engine.applyMappingToProduct(sampleProduct, mappings);

assert.strictEqual(transformed.sku, 'ART-001');
assert.strictEqual(transformed.name, 'Tornillo Acero Inox');
assert.strictEqual(transformed.regularPrice, 12.10);

console.log('✓ Core Mapping Engine Tests Passed');
