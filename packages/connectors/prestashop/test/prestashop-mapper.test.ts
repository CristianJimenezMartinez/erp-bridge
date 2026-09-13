import assert from 'assert';
import { CanonicalProduct } from '@erp-bridge/shared';
import {
  PrestaShopProductMapper,
  PrestaShopOrderMapper,
  PrestaShopCustomerMapper,
  PrestaShopStockMapper,
} from '../src/mappers';
import { PrestaShopXml } from '../src/utils';
import { PrestaShopProduct, PrestaShopOrder, PrestaShopCustomer, PrestaShopAddress } from '../src/types';

console.log('--- Running PrestaShop Mapper & XML Tests ---');

// 1. XML Serialization Tests
const sampleXml = PrestaShopXml.build('stock_available', {
  id: 890,
  id_product: 120,
  id_product_attribute: 450,
  quantity: 15,
});
assert.ok(sampleXml.includes('<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">'));
assert.ok(sampleXml.includes('<stock_available>'));
assert.ok(sampleXml.includes('<quantity>15</quantity>'));
console.log('✓ PrestaShopXml builder passed');

// 2. Product Mapper Tests
const canonicalProduct: CanonicalProduct = {
  id: 'ps_120',
  sku: 'REF-M-AZUL',
  name: 'Camisa Oxford Azul M',
  description: 'Camisa Oxford de algodon 100%',
  shortDescription: 'Camisa Oxford M',
  regularPrice: 39.95,
  costPrice: 20.00,
  stockQuantity: 10,
  manageStock: true,
  inStock: true,
  status: 'published',
  categories: [{ id: '5', name: 'Camisas' }],
  barcode: '8437000000001',
  weight: 0.25,
  images: [],
  attributes: {},
};

const psPayload = PrestaShopProductMapper.toPsProductPayload(canonicalProduct, 120, 1);
assert.strictEqual(psPayload['reference'], 'REF-M-AZUL');
assert.strictEqual(psPayload['price'], '39.950000');
assert.strictEqual(psPayload['active'], 1);
assert.strictEqual(psPayload['ean13'], '8437000000001');

const rawPsProduct: PrestaShopProduct = {
  id: 120,
  reference: 'REF-M-AZUL',
  name: { language: { '@_id': '1', '#text': 'Camisa Oxford Azul M' } },
  price: '39.950000',
  wholesale_price: '20.000000',
  active: 1,
  ean13: '8437000000001',
};
const canonFromPs = PrestaShopProductMapper.toCanonicalProduct(rawPsProduct);
assert.strictEqual(canonFromPs.sku, 'REF-M-AZUL');
assert.strictEqual(canonFromPs.name, 'Camisa Oxford Azul M');
assert.strictEqual(canonFromPs.regularPrice, 39.95);
assert.strictEqual(canonFromPs.status, 'published');
console.log('✓ PrestaShopProductMapper passed');

// 3. Order Mapper Tests
const rawPsOrder: PrestaShopOrder = {
  id: 42,
  reference: 'XDFREK',
  id_customer: 77,
  current_state: 2, // Pago aceptado
  total_paid: '54.45',
  total_paid_tax_incl: '54.45',
  total_paid_tax_excl: '45.00',
  total_shipping_tax_incl: '5.00',
  total_shipping_tax_excl: '4.13',
  date_add: '2026-09-13 10:00:00',
  payment: 'Redsys',
  associations: {
    order_rows: [
      {
        id: 101,
        product_id: 120,
        product_reference: 'REF-M-AZUL',
        product_name: 'Camisa Oxford Azul M',
        product_quantity: '1',
        product_price: '39.95',
        unit_price_tax_excl: '33.02',
        unit_price_tax_incl: '39.95',
        total_price_tax_incl: '39.95',
        total_price_tax_excl: '33.02',
      },
    ],
  },
};

const canonOrder = PrestaShopOrderMapper.toCanonicalOrder(rawPsOrder);
assert.strictEqual(canonOrder.id, '42');
assert.strictEqual(canonOrder.reference, 'PS-42'); // Requirement REFPCL = 'PS-{order_id}'
assert.strictEqual(canonOrder.status, 'processing');
assert.strictEqual(canonOrder.lines.length, 1);
assert.strictEqual(canonOrder.lines[0]?.sku, 'REF-M-AZUL');
assert.strictEqual(PrestaShopOrderMapper.mapStatus(4), 'completed'); // 4 = Enviado
assert.strictEqual(PrestaShopOrderMapper.mapCanonicalStatusToPs('completed'), 4);
console.log('✓ PrestaShopOrderMapper passed');

// 4. Customer Mapper & Recargo de Equivalencia Tests
const psCust: PrestaShopCustomer = {
  id: 77,
  firstname: 'Antonio',
  lastname: 'Recio',
  email: 'antonio@mariscosrecio.es',
  company: 'Mariscos Recio S.L.',
  id_default_group: 4, // Grupo B2B Mayorista
  associations: {
    groups: [{ id: 4 }, { id: 6 }], // 6 es Recargo de Equivalencia
  },
};

const psAddr: PrestaShopAddress = {
  id: 88,
  id_customer: 77,
  firstname: 'Antonio',
  lastname: 'Recio',
  company: 'Mariscos Recio S.L.',
  address1: 'Calle Mayor 1',
  city: 'Madrid',
  postcode: '28013',
  dni: 'B12345678',
};

const canonCustomer = PrestaShopCustomerMapper.toCanonicalCustomer(psCust, psAddr, [6]);
assert.strictEqual(canonCustomer.taxId, 'B12345678');
assert.strictEqual(canonCustomer.fiscalName, 'Mariscos Recio S.L.');
assert.strictEqual(canonCustomer.hasEquivalenceSurcharge, true); // Detectado por grupo 6
console.log('✓ PrestaShopCustomerMapper & R.E. passed');

// 5. Stock Mapper Tests
const stockPayload = PrestaShopStockMapper.toPsStockPayload(890, 120, 450, 25);
assert.strictEqual(stockPayload['id'], 890);
assert.strictEqual(stockPayload['id_product'], 120);
assert.strictEqual(stockPayload['id_product_attribute'], 450);
assert.strictEqual(stockPayload['quantity'], 25);

const canonStock = PrestaShopStockMapper.toCanonicalStock({
  id: 890,
  id_product: 120,
  id_product_attribute: 450,
  quantity: 25,
}, 'REF-M-AZUL');
assert.strictEqual(canonStock.sku, 'REF-M-AZUL');
assert.strictEqual(canonStock.quantity, 25);
console.log('✓ PrestaShopStockMapper passed');

console.log('ALL PRESTASHOP MAPPER TESTS PASSED SUCCESSFULLY');
