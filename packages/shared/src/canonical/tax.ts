import { z } from 'zod';

/**
 * Categorías estándar del Impuesto sobre el Valor Añadido (IVA) en España.
 */
export type SpanishVatType = 'GENERAL' | 'REDUCED' | 'SUPER_REDUCED' | 'EXEMPT';

export const SpanishVatTypeSchema = z.enum([
  'GENERAL',
  'REDUCED',
  'SUPER_REDUCED',
  'EXEMPT',
]);

/**
 * Definición fiscal española estándar con tipos de IVA y Recargo de Equivalencia (R.E.).
 */
export interface SpanishTaxDefinition {
  type: SpanishVatType;
  name: string;
  vatRate: number;        // Porcentaje de IVA: 21%, 10%, 4%, 0%
  surchargeRate: number;  // Porcentaje de R.E.: 5.2%, 1.4%, 0.5%, 0.0%
  factusolCode: number;   // Código nativo de Factusol: 0=21%, 1=10%, 2=4%, 3=0%
}

/**
 * Tabla canónica de tipos de gravamen según la legislación fiscal española vigente.
 */
export const SPANISH_TAX_RATES: Record<SpanishVatType, SpanishTaxDefinition> = {
  GENERAL: {
    type: 'GENERAL',
    name: 'IVA General (21%)',
    vatRate: 21.0,
    surchargeRate: 5.2,
    factusolCode: 0,
  },
  REDUCED: {
    type: 'REDUCED',
    name: 'IVA Reducido (10%)',
    vatRate: 10.0,
    surchargeRate: 1.4,
    factusolCode: 1,
  },
  SUPER_REDUCED: {
    type: 'SUPER_REDUCED',
    name: 'IVA Superreducido (4%)',
    vatRate: 4.0,
    surchargeRate: 0.5,
    factusolCode: 2,
  },
  EXEMPT: {
    type: 'EXEMPT',
    name: 'IVA Exento (0%)',
    vatRate: 0.0,
    surchargeRate: 0.0,
    factusolCode: 3,
  },
} as const;

/**
 * Esquema Zod canónico para impuestos y recargos.
 */
export const CanonicalTaxSchema = z.object({
  type: SpanishVatTypeSchema.default('GENERAL'),
  vatRate: z.number().min(0).max(100),
  surchargeRate: z.number().min(0).max(100).default(0),
  appliesSurcharge: z.boolean().default(false),
  name: z.string().optional(),
  factusolCode: z.number().int().min(0).max(3).optional(),
});

export type CanonicalTax = z.infer<typeof CanonicalTaxSchema>;

/**
 * Desglose aritmético de cálculo fiscal al céntimo.
 */
export interface TaxCalculationBreakdown {
  taxableBase: number;
  vatRate: number;
  vatAmount: number;
  surchargeRate: number;
  surchargeAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

/**
 * Redondeo aritmético exacto al céntimo (2 decimales).
 * Protege contra imprecisiones de coma flotante de IEEE 754 (ej: 1.005 -> 1.01).
 */
export function roundToCent(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula la cuota de IVA redondeada exactamente al céntimo sobre una base imponible.
 */
export function calculateVatAmount(taxableBase: number, vatRate: number): number {
  const roundedBase = roundToCent(taxableBase);
  return roundToCent((roundedBase * vatRate) / 100);
}

/**
 * Calcula la cuota del Recargo de Equivalencia (R.E.) redondeada al céntimo.
 */
export function calculateSurchargeAmount(taxableBase: number, surchargeRate: number): number {
  const roundedBase = roundToCent(taxableBase);
  return roundToCent((roundedBase * surchargeRate) / 100);
}

/**
 * Calcula el desglose completo de impuestos (Base, IVA, R.E. y Totales)
 * garantizando el cuadre al céntimo sin descuadres aritméticos.
 */
export function calculateTaxBreakdown(
  taxableBase: number,
  vatRate: number,
  surchargeRate: number = 0,
  appliesSurcharge: boolean = false
): TaxCalculationBreakdown {
  const base = roundToCent(taxableBase);
  const vatAmount = calculateVatAmount(base, vatRate);
  const effectiveSurchargeRate = appliesSurcharge ? surchargeRate : 0;
  const surchargeAmount = appliesSurcharge ? calculateSurchargeAmount(base, effectiveSurchargeRate) : 0;
  const totalTaxAmount = roundToCent(vatAmount + surchargeAmount);
  const totalAmount = roundToCent(base + totalTaxAmount);

  return {
    taxableBase: base,
    vatRate,
    vatAmount,
    surchargeRate: effectiveSurchargeRate,
    surchargeAmount,
    totalTaxAmount,
    totalAmount,
  };
}

/**
 * Obtiene la configuración canónica de impuestos por categoría española.
 */
export function getSpanishTaxByType(type: SpanishVatType, appliesSurcharge: boolean = false): CanonicalTax {
  const def = SPANISH_TAX_RATES[type];
  return {
    type: def.type,
    vatRate: def.vatRate,
    surchargeRate: def.surchargeRate,
    appliesSurcharge,
    name: def.name,
    factusolCode: def.factusolCode,
  };
}

/**
 * Resuelve el CanonicalTax canónico a partir del porcentaje de IVA numérico (ej. 21 -> GENERAL).
 */
export function getSpanishTaxByRate(vatRate: number, appliesSurcharge: boolean = false): CanonicalTax {
  const roundedRate = Math.round(vatRate);
  if (roundedRate === 21) return getSpanishTaxByType('GENERAL', appliesSurcharge);
  if (roundedRate === 10) return getSpanishTaxByType('REDUCED', appliesSurcharge);
  if (roundedRate === 4) return getSpanishTaxByType('SUPER_REDUCED', appliesSurcharge);
  if (roundedRate === 0) return getSpanishTaxByType('EXEMPT', appliesSurcharge);

  return {
    type: 'GENERAL',
    vatRate,
    surchargeRate: appliesSurcharge ? 5.2 : 0,
    appliesSurcharge,
    name: `IVA ${vatRate}%`,
  };
}

/**
 * Resuelve el CanonicalTax canónico a partir del código numérico de IVA de Factusol (0=21%, 1=10%, 2=4%, 3=0%).
 */
export function getSpanishTaxByFactusolCode(code: number, appliesSurcharge: boolean = false): CanonicalTax {
  switch (code) {
    case 0:
      return getSpanishTaxByType('GENERAL', appliesSurcharge);
    case 1:
      return getSpanishTaxByType('REDUCED', appliesSurcharge);
    case 2:
      return getSpanishTaxByType('SUPER_REDUCED', appliesSurcharge);
    case 3:
      return getSpanishTaxByType('EXEMPT', appliesSurcharge);
    default:
      return getSpanishTaxByType('GENERAL', appliesSurcharge);
  }
}
