import { CanonicalProduct } from '@erp-bridge/shared';

export interface WooCommerceProductPayload {
  id?: number;
  name: string;
  type?: string;
  regular_price: string;
  sale_price?: string;
  description?: string;
  short_description?: string;
  sku: string;
  manage_stock: boolean;
  stock_quantity: number;
  status: 'publish' | 'draft' | 'pending' | 'private';
  categories?: Array<{ id?: number; name?: string }>;
  images?: Array<{ src: string; alt?: string }>;
  weight?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
}

export interface MapToWooCommerceOptions {
  skipImages?: boolean;
}

export function mapCanonicalToWooCommerce(
  product: CanonicalProduct,
  targetId?: number,
  options?: MapToWooCommerceOptions
): WooCommerceProductPayload {
  const payload: WooCommerceProductPayload = {
    name: product.name,
    type: 'simple',
    sku: product.sku,
    regular_price: String(product.regularPrice || 0),
    description: product.description || '',
    short_description: product.shortDescription || '',
    manage_stock: product.manageStock ?? true,
    stock_quantity: product.stockQuantity ?? 0,
    status: product.status === 'published' ? 'publish' : 'draft',
  };

  if (targetId) {
    payload.id = targetId;
  }

  if (product.salePrice && product.salePrice > 0) {
    payload.sale_price = String(product.salePrice);
  }

  if (product.weight) {
    payload.weight = String(product.weight);
  }

  if (product.categories && product.categories.length > 0) {
    payload.categories = product.categories.map((c) => ({ name: c.name }));
  }

  if (!options?.skipImages && product.images && product.images.length > 0) {
    payload.images = product.images.map((img) => ({
      src: img.url,
      alt: img.alt || product.name,
    }));
  }

  return payload;
}

export function mapWooCommerceToCanonical(raw: Record<string, unknown>): CanonicalProduct {
  const id = String(raw['id'] || '');
  const sku = String(raw['sku'] || id);
  const name = String(raw['name'] || `Producto ${sku}`);
  const regularPrice = Number(raw['regular_price']) || Number(raw['price']) || 0;
  const salePrice = raw['sale_price'] ? Number(raw['sale_price']) : undefined;
  const stockQuantity = typeof raw['stock_quantity'] === 'number' ? raw['stock_quantity'] : 0;
  const manageStock = Boolean(raw['manage_stock']);
  const status = raw['status'] === 'publish' ? 'published' : 'draft';

  return {
    id: `wc_${id}`,
    sku,
    name,
    description: String(raw['description'] || ''),
    shortDescription: String(raw['short_description'] || ''),
    regularPrice,
    salePrice,
    stockQuantity,
    manageStock,
    inStock: Boolean(raw['in_stock'] ?? stockQuantity > 0),
    status,
    categories: Array.isArray(raw['categories'])
      ? (raw['categories'] as Array<{ id: number; name: string; slug: string }>).map((c) => ({
          id: String(c.id),
          name: c.name,
          slug: c.slug,
        }))
      : [],
    images: Array.isArray(raw['images'])
      ? (raw['images'] as Array<{ src: string; alt?: string }>).map((img) => ({ url: img.src, alt: img.alt }))
      : [],
    attributes: {},
    rawSourceData: raw,
  };
}
