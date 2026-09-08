import { CanonicalProduct } from '@erp-bridge/shared';

export interface SimplyGestArticleRaw {
  CODIGO: string;
  DESCR: string;
  DESCR_LARGA?: string;
  PRECIO_E: number | string;
  PRECIO_C?: number | string;
  STOCK?: number | string;
  IMPUESTO?: number | string;
  FAMILIA?: string;
  CODBARRAS?: string;
}

export function mapSimplyGestArticleToCanonical(raw: SimplyGestArticleRaw): CanonicalProduct {
  const sku = String(raw.CODIGO ?? '').trim();
  const name = String(raw.DESCR ?? '').trim() || `Artículo ${sku}`;
  const regularPrice = Number(raw.PRECIO_E) || 0;
  const costPrice = raw.PRECIO_C !== undefined && raw.PRECIO_C !== null ? Number(raw.PRECIO_C) : undefined;
  const stockQuantity = Number(raw.STOCK) || 0;
  const barcode = raw.CODBARRAS ? String(raw.CODBARRAS).trim() : undefined;
  const family = raw.FAMILIA ? String(raw.FAMILIA).trim() : undefined;
  const description = raw.DESCR_LARGA ? String(raw.DESCR_LARGA).trim() : name;

  // Tax class mapping: 0 = 21%, 1 = 10%, 2 = 4%, 3 = 0%
  let taxClass = 'standard';
  const taxCode = Number(raw.IMPUESTO);
  if (taxCode === 1) taxClass = 'reduced';
  else if (taxCode === 2) taxClass = 'super-reduced';
  else if (taxCode === 3) taxClass = 'zero';

  return {
    id: `sg_${sku}`,
    sku,
    name,
    description,
    shortDescription: name,
    regularPrice,
    costPrice,
    stockQuantity,
    manageStock: true,
    inStock: stockQuantity > 0,
    status: 'published',
    barcode,
    categories: family ? [{ id: family, name: family, slug: family.toLowerCase().replace(/\s+/g, '-') }] : [],
    images: [],
    attributes: {
      taxClass,
      simplygestImpuesto: taxCode,
    },
    rawSourceData: raw as unknown as Record<string, unknown>,
  };
}
