import { z } from 'zod';

export const CanonicalStockSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number(),
  availableQuantity: z.number().optional(),
  warehouse: z.string().default('GEN'),
  location: z.string().optional(),
  minStock: z.number().optional(),
  lastUpdated: z.date().default(() => new Date()),
  rawSourceData: z.record(z.unknown()).optional(),
});

export type CanonicalStock = z.infer<typeof CanonicalStockSchema>;

/**
 * Esquema canónico para actualizaciones atómicas de stock.
 * Soporta SKU, código de barras (EAN13) y stock disponible (DISSTO en Factusol).
 */
export const CanonicalStockUpdateSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  availableStock: z.number(), // Stock disponible para venta (DISSTO en Factusol = ACTSTO - COMSTO)
  physicalStock: z.number().optional(), // Stock físico actual (ACTSTO)
  committedStock: z.number().optional(), // Stock comprometido en pedidos (COMSTO)
  warehouse: z.string().default('GEN'), // Código de almacén (ALMSTO)
  lastUpdated: z.date().default(() => new Date()),
  rawSourceData: z.record(z.unknown()).optional(),
});

export type CanonicalStockUpdate = z.infer<typeof CanonicalStockUpdateSchema>;
