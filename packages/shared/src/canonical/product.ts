import { z } from 'zod';

export const CanonicalDimensionsSchema = z.object({
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  unit: z.string().default('cm'),
});

export type CanonicalDimensions = z.infer<typeof CanonicalDimensionsSchema>;

export const CanonicalImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().or(z.string()),
  alt: z.string().optional(),
  position: z.number().optional(),
  hash: z.string().optional(), // Hash MD5 para deduplicación y blindaje en WordPress
});

export type CanonicalImage = z.infer<typeof CanonicalImageSchema>;

export const CanonicalCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  parent: z.string().optional(),
});

export type CanonicalCategory = z.infer<typeof CanonicalCategorySchema>;

export const B2BPriceEntrySchema = z.object({
  tariffCode: z.string(),
  price: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export type B2BPriceEntry = z.infer<typeof B2BPriceEntrySchema>;

export const ProductStatusSchema = z.enum(['draft', 'published', 'archived', 'private']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const CanonicalProductSchema = z.object({
  id: z.string(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  regularPrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().default(0),
  manageStock: z.boolean().default(true),
  inStock: z.boolean().default(true),
  status: ProductStatusSchema.default('published'),
  categories: z.array(CanonicalCategorySchema).default([]),
  barcode: z.string().optional(),
  weight: z.number().optional(),
  dimensions: CanonicalDimensionsSchema.optional(),
  images: z.array(CanonicalImageSchema).default([]),
  attributes: z.record(z.string(), z.string()).default({}),
  rawSourceData: z.record(z.string(), z.unknown()).optional(),
  b2bPrices: z.array(B2BPriceEntrySchema).optional(),
  parentId: z.string().optional(),
  combinationId: z.union([z.string(), z.number()]).optional(),
  dataHash: z.string().optional(),
  priceHash: z.string().optional(),
  stockHash: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CanonicalProduct = z.infer<typeof CanonicalProductSchema>;
