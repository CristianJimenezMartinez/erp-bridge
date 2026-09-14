import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { WooCommerceClient } from '../client';

export interface ParentProductGroup {
  parent?: CanonicalProduct;
  variations: CanonicalProduct[];
}

/**
 * Determina la clave del producto padre y si el producto canónico actual es una variación.
 */
function resolveParentAndVariationInfo(
  product: CanonicalProduct,
  allSkus: Set<string>
): { parentKey: string; isVariation: boolean } {
  const sku = product.sku.trim();
  const attrs = product.attributes || {};

  // 1. Atributo explícito parentSku o parent_sku
  const explicitParentSku = (attrs['parentSku'] || attrs['parent_sku'])?.trim();
  if (explicitParentSku) {
    if (explicitParentSku === sku) {
      return { parentKey: sku, isVariation: false };
    }
    return { parentKey: explicitParentSku, isVariation: true };
  }

  // 2. Campo canónico parentId
  if (
    product.parentId &&
    product.parentId.trim() &&
    product.parentId.trim() !== product.id &&
    product.parentId.trim() !== sku
  ) {
    return { parentKey: product.parentId.trim(), isVariation: true };
  }

  // 3. Comprobar si algún SKU del catálogo coincide exactamente con un prefijo antes de delimitador
  // ej. allSkus contiene 'CAMISA' y el SKU actual es 'CAMISA-S-AZUL'
  if (sku.includes('-') || sku.includes('_')) {
    const delimiter = sku.includes('-') ? '-' : '_';
    const parts = sku.split(delimiter);
    for (let i = parts.length - 1; i >= 1; i--) {
      const candidatePrefix = parts.slice(0, i).join(delimiter);
      if (allSkus.has(candidatePrefix) && candidatePrefix !== sku) {
        return { parentKey: candidatePrefix, isVariation: true };
      }
    }
  }

  // 4. Comprobar si tiene atributos de variación típicos (talla, color, CP1..CP5 de Factusol)
  const hasVariationAttrs = Boolean(
    attrs['talla'] ||
    attrs['size'] ||
    attrs['pa_talla'] ||
    attrs['color'] ||
    attrs['colour'] ||
    attrs['pa_color'] ||
    attrs['cp1'] ||
    attrs['cp2'] ||
    attrs['cp3'] ||
    attrs['cp4'] ||
    attrs['cp5'] ||
    attrs['variant'] ||
    attrs['variante']
  );

  if (hasVariationAttrs && (sku.includes('-') || sku.includes('_'))) {
    const baseSku = extractBaseSku(sku, attrs);
    if (baseSku && baseSku !== sku) {
      return { parentKey: baseSku, isVariation: true };
    }
  }

  // 5. Si no tiene atributos de variación explícitos pero el SKU contiene delimitadores,
  // verificar si comparte prefijo con otros artículos del catálogo
  if (sku.includes('-') || sku.includes('_')) {
    const delimiter = sku.includes('-') ? '-' : '_';
    const parts = sku.split(delimiter);
    if (parts.length >= 2) {
      const basePrefix = parts[0]!;
      let count = 0;
      for (const s of allSkus) {
        if (s.startsWith(`${basePrefix}${delimiter}`) || s === basePrefix) {
          count++;
        }
      }
      if (count > 1) {
        if (sku === basePrefix) {
          return { parentKey: basePrefix, isVariation: false };
        }
        return { parentKey: basePrefix, isVariation: true };
      }
    }
  }

  // Si no se detectan características de variación, se asume producto padre o simple
  return { parentKey: sku, isVariation: false };
}

/**
 * Extrae el SKU base a partir de delimitadores y atributos conocidos.
 */
function extractBaseSku(sku: string, attrs: Record<string, string>): string {
  const delimiter = sku.includes('-') ? '-' : '_';
  const parts = sku.split(delimiter);

  const variationValues = new Set<string>();
  const variantKeys = [
    'talla',
    'size',
    'pa_talla',
    'color',
    'colour',
    'pa_color',
    'cp1',
    'cp2',
    'cp3',
    'cp4',
    'cp5',
    'variant',
    'variante',
  ];

  for (const k of variantKeys) {
    const v = attrs[k]?.trim().toLowerCase();
    if (v) variationValues.add(v);
  }

  while (parts.length > 1 && variationValues.has(parts[parts.length - 1]!.toLowerCase())) {
    parts.pop();
  }

  if (parts.length < sku.split(delimiter).length) {
    return parts.join(delimiter);
  }

  return parts[0] || sku;
}

/**
 * Agrupa artículos que compartan prefijo base de SKU o atributo `parentSku`
 * para estructurarlos como un producto padre `variable` con sus variaciones hijas.
 */
export function groupProductsByParent(
  products: CanonicalProduct[]
): Map<string, ParentProductGroup> {
  const result = new Map<string, ParentProductGroup>();
  const allSkus = new Set(products.map((p) => p.sku.trim()));

  for (const product of products) {
    const { parentKey, isVariation } = resolveParentAndVariationInfo(product, allSkus);

    let entry = result.get(parentKey);
    if (!entry) {
      entry = { variations: [] };
      result.set(parentKey, entry);
    }

    if (isVariation) {
      entry.variations.push(product);
    } else {
      entry.parent = product;
    }
  }

  return result;
}

/**
 * Mapea atributos específicos (talla, color, CP1..CP5 de Factusol) al formato de atributos
 * de variación de WooCommerce (`{ name, option }`).
 */
export function toWooCommerceVariationPayload(
  canonical: CanonicalProduct
): Record<string, unknown> {
  const attributes: Array<{ id?: number; name: string; option: string }> = [];

  if (canonical.attributes) {
    for (const [key, rawValue] of Object.entries(canonical.attributes)) {
      if (!rawValue || typeof rawValue !== 'string' || !rawValue.trim()) continue;
      const value = rawValue.trim();
      const lowerKey = key.toLowerCase();

      // Ignorar campos de metadatos internos del ERP que no son atributos de variante
      if (
        [
          'parentsku',
          'parent_sku',
          'parentid',
          'unit',
          'familycode',
          'taxrate',
          'tivart',
          'stoart',
          'webmemo',
          'has_combinations',
          'combinations_count',
        ].includes(lowerKey)
      ) {
        continue;
      }

      let attrName = key;
      if (lowerKey === 'talla' || lowerKey === 'size' || lowerKey === 'pa_talla') {
        attrName = 'Talla';
      } else if (lowerKey === 'color' || lowerKey === 'colour' || lowerKey === 'pa_color') {
        attrName = 'Color';
      } else if (lowerKey === 'cp1') {
        attrName = 'Talla'; // Factusol CP1ART suele ser Talla
      } else if (lowerKey === 'cp2') {
        attrName = 'Color'; // Factusol CP2ART suele ser Color
      } else if (lowerKey === 'cp3') {
        attrName = 'Acabado';
      } else if (lowerKey === 'cp4') {
        attrName = 'Material';
      } else if (lowerKey === 'cp5') {
        attrName = 'Propiedad';
      }

      // Evitar duplicados por si vienen talla y size o cp1 simultáneamente
      const existing = attributes.find((a) => a.name.toLowerCase() === attrName.toLowerCase());
      if (!existing) {
        attributes.push({ name: attrName, option: value });
      }
    }
  }

  const payload: Record<string, unknown> = {
    sku: canonical.sku,
    regular_price: String(canonical.regularPrice ?? 0),
    manage_stock: canonical.manageStock ?? true,
    stock_quantity: Math.max(0, canonical.stockQuantity ?? 0),
    status: canonical.status === 'published' ? 'publish' : 'draft',
    attributes,
  };

  if (canonical.salePrice !== undefined && canonical.salePrice > 0) {
    payload['sale_price'] = String(canonical.salePrice);
  }

  if (canonical.description) {
    payload['description'] = canonical.description;
  }

  if (canonical.weight) {
    payload['weight'] = String(canonical.weight);
  }

  if (canonical.dimensions) {
    const dims: Record<string, string> = {};
    if (canonical.dimensions.length) dims['length'] = String(canonical.dimensions.length);
    if (canonical.dimensions.width) dims['width'] = String(canonical.dimensions.width);
    if (canonical.dimensions.height) dims['height'] = String(canonical.dimensions.height);
    if (Object.keys(dims).length > 0) {
      payload['dimensions'] = dims;
    }
  }

  if (canonical.images && canonical.images.length > 0 && canonical.images[0]?.url) {
    payload['image'] = {
      src: canonical.images[0].url,
      alt: canonical.images[0].alt || canonical.name,
    };
  }

  return payload;
}

export class WooCommerceVariationHandler {
  constructor(
    private readonly client: WooCommerceClient,
    private readonly logger: Logger
  ) {}

  /**
   * Agrupa productos canónicos por SKU padre o prefijo común.
   */
  public groupProductsByParent(
    products: CanonicalProduct[]
  ): Map<string, ParentProductGroup> {
    return groupProductsByParent(products);
  }

  /**
   * Genera el payload para una variación de WooCommerce.
   */
  public toWooCommerceVariationPayload(
    canonical: CanonicalProduct
  ): Record<string, unknown> {
    return toWooCommerceVariationPayload(canonical);
  }

  /**
   * Actualiza existencias directamente en `/wp-json/wc/v3/products/<productId>/variations/<variationId>`.
   */
  public async syncVariationStock(
    productId: number,
    variationId: number,
    stockQuantity: number
  ): Promise<boolean> {
    try {
      const sanitizedStock = Math.max(0, stockQuantity);
      const payload = {
        manage_stock: true,
        stock_quantity: sanitizedStock,
        in_stock: sanitizedStock > 0,
        stock_status: sanitizedStock > 0 ? 'instock' : 'outofstock',
      };

      await this.client.put<{ id: number; stock_quantity: number }>(
        `products/${productId}/variations/${variationId}`,
        payload
      );

      this.logger.info(
        `Stock de variación actualizado en WooCommerce: Producto ${productId}, Variación ${variationId} -> ${sanitizedStock} unidades`
      );
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error al actualizar stock de variación ${variationId} del producto ${productId}: ${msg}`,
        error
      );
      return false;
    }
  }

  /**
   * Crea una nueva variación bajo el producto variable padre.
   */
  public async createVariation(
    productId: number,
    canonical: CanonicalProduct
  ): Promise<Record<string, unknown>> {
    const payload = toWooCommerceVariationPayload(canonical);
    return this.client.post<Record<string, unknown>>(
      `products/${productId}/variations`,
      payload
    );
  }

  /**
   * Obtiene todas las variaciones de un producto padre.
   */
  public async readVariations(
    productId: number
  ): Promise<Array<Record<string, unknown>>> {
    return this.client.get<Array<Record<string, unknown>>>(
      `products/${productId}/variations`,
      { per_page: 100 }
    );
  }
}
