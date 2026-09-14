import assert from 'assert';
import { FactusolInvoiceMapper } from '../src/mappers/invoice.mapper';
import { CanonicalInvoice } from '@erp-bridge/shared';

console.log('--- Running Factusol Invoice Mapper Tests ---');

// 1. Test toCanonical mapping
const rawHeader = {
  TIPFAC: '1',
  CODFAC: 501,
  REFFAC: 'WC-REF-8899',
  FECFAC: '2026-08-24',
  ESTFAC: '2',
  ALMFAC: 'GEN',
  CLIFAC: 10008,
  CNOFAC: 'CLIENTE PRUEBA SL',
  CDOFAC: 'Calle Mayor 10',
  CPOFAC: '28001',
  CCPFAC: 'Madrid',
  CPRFAC: 'Madrid',
  TELFAC: '600000000',
  CEMFAC: 'facturas@clienteprueba.es',
  PIVA1FAC: 21,
  NET1FAC: 100.0,
  IIVA1FAC: 21.0,
  IPOR1FAC: 5.0,
  TOTFAC: 126.0,
};

const rawLines = [
  {
    TIPLFA: '1',
    CODLFA: 501,
    POSLFA: 1,
    ARTLFA: '000001',
    DESLFA: 'M. TUBO PVC ENC 8/ 50 MM.',
    CANLFA: 5,
    PRELFA: 20.0,
    TOTLFA: 100.0,
  },
];

const canonical = FactusolInvoiceMapper.toCanonical(rawHeader, rawLines);
assert.strictEqual(canonical.series, '1');
assert.strictEqual(canonical.invoiceNumber, '501');
assert.strictEqual(canonical.orderReference, 'WC-REF-8899');
assert.strictEqual(canonical.status, 'paid');
assert.strictEqual(canonical.netAmount, 100.0);
assert.strictEqual(canonical.taxAmount, 21.0);
assert.strictEqual(canonical.shippingCost, 5.0);
assert.strictEqual(canonical.totalAmount, 126.0);
assert.strictEqual(canonical.lines.length, 1);
assert.strictEqual(canonical.lines[0]!.sku, '000001');

// 2. Test toFactusolHeader and toFactusolLines
const invoiceObj: CanonicalInvoice = {
  id: 'inv_test_01',
  series: '1',
  invoiceNumber: '600',
  orderReference: 'REF-ORDER-600',
  issueDate: new Date('2026-08-24'),
  status: 'issued',
  customer: {
    customerCode: '10008',
    name: 'CLIENTE TEST S.L.',
    email: 'contacto@test.es',
    billingAddress: {
      street: 'Avda Principal 1',
      postalCode: '41001',
      city: 'Sevilla',
      province: 'Sevilla',
      country: 'ES',
    },
  },
  lines: [
    {
      position: 1,
      sku: '000002',
      description: 'M. TUBO PVC ENC 6/ 63 MM.',
      quantity: 2,
      unitPrice: 25.0,
      discountPercent: 0,
      taxRate: 21,
      taxAmount: 10.5,
      lineTotal: 50.0,
    },
  ],
  shippingCost: 10.0,
  netAmount: 50.0,
  taxAmount: 10.5,
  taxBreakdown: [
    {
      rate: 21,
      baseAmount: 50.0,
      taxAmount: 10.5,
    },
  ],
  totalAmount: 70.5,
  currency: 'EUR',
};

const headerFactusol = FactusolInvoiceMapper.toFactusolHeader(invoiceObj, 600, 'GEN');
assert.strictEqual(headerFactusol.tipfac, '1');
assert.strictEqual(headerFactusol.codfac, 600);
assert.strictEqual(headerFactusol.reffac, 'REF-ORDER-600');
assert.strictEqual(headerFactusol.clifac, 10008);
assert.strictEqual(headerFactusol.totfac, 70.5);
assert.strictEqual(headerFactusol.usufac, 0, 'USUFAC must be 0');
assert(headerFactusol.horfac.startsWith('#') && headerFactusol.horfac.endsWith('#'), 'HORFAC must be #HH:MM:SS#');
assert.strictEqual(headerFactusol.bas1fac, 60.0, 'BAS1FAC must be netAmount + shippingCost');
assert.strictEqual(headerFactusol.iiva1fac, 10.5, 'IIVA1FAC must be taxAmount');
assert.strictEqual(headerFactusol.fopfac, 'TAR', 'Default FOPFAC must be TAR');

import { insertInvoiceHeaderQuery } from '../src/queries';
const invoiceHeaderSql = insertInvoiceHeaderQuery(headerFactusol);
assert(invoiceHeaderSql.includes('CNIFAC'), 'Invoice header SQL must include CNIFAC');
assert(invoiceHeaderSql.includes('BAS1FAC'), 'Invoice header SQL must include BAS1FAC');
assert(invoiceHeaderSql.includes('IIVA1FAC'), 'Invoice header SQL must include IIVA1FAC');
assert(invoiceHeaderSql.includes('FOPFAC'), 'Invoice header SQL must include FOPFAC');
assert(invoiceHeaderSql.includes('USUFAC'), 'Invoice header SQL must include USUFAC');
assert(invoiceHeaderSql.includes('HORFAC'), 'Invoice header SQL must include HORFAC');

const linesFactusol = FactusolInvoiceMapper.toFactusolLines(invoiceObj, 600);
assert.strictEqual(linesFactusol.length, 1);
assert.strictEqual(linesFactusol[0]!.artlfa, '000002');
assert.strictEqual(linesFactusol[0]!.totlfa, 50.0);

console.log('✓ Factusol Invoice Mapper Tests Passed');

