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
