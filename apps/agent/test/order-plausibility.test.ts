import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OrderPlausibilityAdapter } from '../src/adapters/order-plausibility.adapter';
import { CanonicalOrder } from '@erp-bridge/shared';

describe('OrderPlausibilityAdapter', () => {
  const validBaseOrder: CanonicalOrder = {
    id: 'ord_100',
    orderNumber: '100',
    series: 'A',
    reference: 'WEB-100',
    date: new Date('2026-10-09T10:00:00Z'),
    status: 'pending',
    customer: {
      id: 'cust_1',
      fiscalName: 'Empresa Cliente SL',
      taxId: 'B12345678',
      email: 'pedidos@cliente.com',
      phone: '600112233',
      hasEquivalenceSurcharge: false,
    },
    lines: [
      {
        id: 'line_1',
        position: 1,
        sku: 'ART-001',
        name: 'Tornillo M6 Acero',
        quantity: 10,
        unitPrice: 1.5,
        discountPercent: 0,
        vatPercent: 21,
        vatType: 0,
        subtotal: 15,
        total: 18.15,
      },
    ],
    netAmount: 15,
    taxAmount: 3.15,
    shippingAmount: 0,
    totalAmount: 18.15,
    warehouse: 'GEN',
    hasEquivalenceSurcharge: false,
    discountAmount: 0,
    currency: 'EUR',
  };

  it('debe aceptar y sanear un pedido canónico válido', () => {
    const result = OrderPlausibilityAdapter.validateAndSanitize(validBaseOrder);
    assert.strictEqual(result.valid, true);
    assert.ok(result.sanitizedOrder);
    assert.strictEqual(result.sanitizedOrder!.orderNumber, '100');
    assert.strictEqual(result.sanitizedOrder!.lines.length, 1);
    assert.strictEqual(result.sanitizedOrder!.lines[0]!.sku, 'ART-001');
  });

  it('debe eliminar caracteres de control en strings (SKU, nombre, cliente)', () => {
    const maliciousOrder = {
      ...validBaseOrder,
      orderNumber: '100\x00\x1f',
      customer: {
        ...validBaseOrder.customer,
        fiscalName: 'Empresa\x00 Inyectada\x1f SL',
        taxId: 'B12345678\x00',
      },
      lines: [
        {
          ...validBaseOrder.lines[0],
          sku: 'ART\x00-001\x1b',
          name: 'Tornillo \x07Control',
        },
      ],
    };

    const result = OrderPlausibilityAdapter.validateAndSanitize(maliciousOrder);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.sanitizedOrder!.orderNumber, '100');
    assert.strictEqual(result.sanitizedOrder!.customer.fiscalName, 'Empresa Inyectada SL');
    assert.strictEqual(result.sanitizedOrder!.customer.taxId, 'B12345678');
    assert.strictEqual(result.sanitizedOrder!.lines[0]!.sku, 'ART-001');
    assert.strictEqual(result.sanitizedOrder!.lines[0]!.name, 'Tornillo Control');
  });

  it('debe rechazar pedidos con cantidades negativas o cero', () => {
    const badQtyOrder = {
      ...validBaseOrder,
      lines: [
        {
          ...validBaseOrder.lines[0],
          quantity: -5,
        },
      ],
    };
    const resNegative = OrderPlausibilityAdapter.validateAndSanitize(badQtyOrder);
    assert.strictEqual(resNegative.valid, false);
    assert.match(resNegative.error || '', /cantidad no válida/i);

    const zeroQtyOrder = {
      ...validBaseOrder,
      lines: [
        {
          ...validBaseOrder.lines[0],
          quantity: 0,
        },
      ],
    };
    const resZero = OrderPlausibilityAdapter.validateAndSanitize(zeroQtyOrder);
    assert.strictEqual(resZero.valid, false);
  });

  it('debe rechazar pedidos con precios negativos o NaN/Infinity', () => {
    const badPriceOrder = {
      ...validBaseOrder,
      lines: [
        {
          ...validBaseOrder.lines[0],
          unitPrice: -10,
        },
      ],
    };
    const resNegativePrice = OrderPlausibilityAdapter.validateAndSanitize(badPriceOrder);
    assert.strictEqual(resNegativePrice.valid, false);

    const nanPriceOrder = {
      ...validBaseOrder,
      lines: [
        {
          ...validBaseOrder.lines[0],
          unitPrice: NaN,
        },
      ],
    };
    const resNan = OrderPlausibilityAdapter.validateAndSanitize(nanPriceOrder);
    assert.strictEqual(resNan.valid, false);
  });

  it('debe rechazar pedidos sin líneas o con más de 500 líneas', () => {
    const emptyOrder = { ...validBaseOrder, lines: [] };
    const resEmpty = OrderPlausibilityAdapter.validateAndSanitize(emptyOrder);
    assert.strictEqual(resEmpty.valid, false);

    const hugeLines = Array.from({ length: 501 }, (_, i) => ({
      ...validBaseOrder.lines[0],
      id: `line_${i}`,
    }));
    const resHuge = OrderPlausibilityAdapter.validateAndSanitize({ ...validBaseOrder, lines: hugeLines });
    assert.strictEqual(resHuge.valid, false);
    assert.match(resHuge.error || '', /supera el máximo permitido/i);
  });

  it('debe truncar cadenas a los límites seguros de Factusol/Access', () => {
    const longStringOrder = {
      ...validBaseOrder,
      customer: {
        ...validBaseOrder.customer,
        fiscalName: 'A'.repeat(200),
        taxId: 'B'.repeat(50),
      },
      lines: [
        {
          ...validBaseOrder.lines[0],
          sku: 'S'.repeat(60),
          name: 'N'.repeat(200),
        },
      ],
    };

    const result = OrderPlausibilityAdapter.validateAndSanitize(longStringOrder);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.sanitizedOrder!.customer.fiscalName.length, 100);
    assert.strictEqual(result.sanitizedOrder!.customer.taxId?.length, 20);
    assert.strictEqual(result.sanitizedOrder!.lines[0]!.sku.length, 30);
    assert.strictEqual(result.sanitizedOrder!.lines[0]!.name.length, 100);
  });
});
