import assert from 'assert';
import {
  CanonicalTaxSchema,
  SPANISH_TAX_RATES,
  roundToCent,
  calculateVatAmount,
  calculateSurchargeAmount,
  calculateTaxBreakdown,
  getSpanishTaxByType,
  getSpanishTaxByRate,
  getSpanishTaxByFactusolCode,
} from '../src/canonical/tax';

console.log('--- Running Shared Canonical Tax Tests ---');

// 1. Verificación de tasas oficiales españolas
assert.strictEqual(SPANISH_TAX_RATES.GENERAL.vatRate, 21.0);
assert.strictEqual(SPANISH_TAX_RATES.GENERAL.surchargeRate, 5.2);
assert.strictEqual(SPANISH_TAX_RATES.GENERAL.factusolCode, 0);

assert.strictEqual(SPANISH_TAX_RATES.REDUCED.vatRate, 10.0);
assert.strictEqual(SPANISH_TAX_RATES.REDUCED.surchargeRate, 1.4);
assert.strictEqual(SPANISH_TAX_RATES.REDUCED.factusolCode, 1);

assert.strictEqual(SPANISH_TAX_RATES.SUPER_REDUCED.vatRate, 4.0);
assert.strictEqual(SPANISH_TAX_RATES.SUPER_REDUCED.surchargeRate, 0.5);
assert.strictEqual(SPANISH_TAX_RATES.SUPER_REDUCED.factusolCode, 2);

assert.strictEqual(SPANISH_TAX_RATES.EXEMPT.vatRate, 0.0);
assert.strictEqual(SPANISH_TAX_RATES.EXEMPT.surchargeRate, 0.0);
assert.strictEqual(SPANISH_TAX_RATES.EXEMPT.factusolCode, 3);

// 2. Esquema Zod CanonicalTax
const parsedTax = CanonicalTaxSchema.parse({
  type: 'GENERAL',
  vatRate: 21.0,
  surchargeRate: 5.2,
  appliesSurcharge: true,
  name: 'IVA General 21%',
  factusolCode: 0,
});
assert.strictEqual(parsedTax.vatRate, 21.0);
assert.strictEqual(parsedTax.appliesSurcharge, true);

// 3. Redondeo bancario/comercial al céntimo
assert.strictEqual(roundToCent(10.554), 10.55);
assert.strictEqual(roundToCent(10.555), 10.56);
assert.strictEqual(roundToCent(1.005), 1.01);
assert.strictEqual(roundToCent(0.0), 0.0);

// 4. Cálculo de cuota de IVA
// Base 100€ al 21% = 21.00€
assert.strictEqual(calculateVatAmount(100.0, 21.0), 21.0);
// Base 33.33€ al 21% = 6.9993 -> 7.00€
assert.strictEqual(calculateVatAmount(33.33, 21.0), 7.0);

// 5. Cálculo de Recargo de Equivalencia
// Base 100€ al 5.2% = 5.20€
assert.strictEqual(calculateSurchargeAmount(100.0, 5.2), 5.2);
// Base 33.33€ al 5.2% = 1.73316 -> 1.73€
assert.strictEqual(calculateSurchargeAmount(33.33, 5.2), 1.73);

// 6. Desglose completo sin descuadres
// Caso estándar: Base 100.00€, IVA 21%, sin R.E.
const breakdownNoRE = calculateTaxBreakdown(100.0, 21.0, 5.2, false);
assert.strictEqual(breakdownNoRE.taxableBase, 100.0);
assert.strictEqual(breakdownNoRE.vatAmount, 21.0);
assert.strictEqual(breakdownNoRE.surchargeAmount, 0.0);
assert.strictEqual(breakdownNoRE.totalTaxAmount, 21.0);
assert.strictEqual(breakdownNoRE.totalAmount, 121.0);

// Caso con R.E. activo: Base 150.00€, IVA 21%, R.E. 5.2%
// IVA = 31.50€, RE = 7.80€, Total Impuestos = 39.30€, Total Factura = 189.30€
const breakdownWithRE = calculateTaxBreakdown(150.0, 21.0, 5.2, true);
assert.strictEqual(breakdownWithRE.taxableBase, 150.0);
assert.strictEqual(breakdownWithRE.vatAmount, 31.5);
assert.strictEqual(breakdownWithRE.surchargeAmount, 7.8);
assert.strictEqual(breakdownWithRE.totalTaxAmount, 39.3);
assert.strictEqual(breakdownWithRE.totalAmount, 189.3);

// 7. Resolutores canónicos
const resolvedByType = getSpanishTaxByType('GENERAL', true);
assert.strictEqual(resolvedByType.type, 'GENERAL');
assert.strictEqual(resolvedByType.vatRate, 21.0);
assert.strictEqual(resolvedByType.surchargeRate, 5.2);
assert.strictEqual(resolvedByType.appliesSurcharge, true);

const resolvedByRate = getSpanishTaxByRate(21, true);
assert.strictEqual(resolvedByRate.type, 'GENERAL');
assert.strictEqual(resolvedByRate.vatRate, 21.0);
assert.strictEqual(resolvedByRate.surchargeRate, 5.2);
assert.strictEqual(resolvedByRate.appliesSurcharge, true);

const resolvedByFactusol = getSpanishTaxByFactusolCode(1, false);
assert.strictEqual(resolvedByFactusol.type, 'REDUCED');
assert.strictEqual(resolvedByFactusol.vatRate, 10.0);
assert.strictEqual(resolvedByFactusol.factusolCode, 1);

console.log('✓ Shared Canonical Tax Tests Passed');
