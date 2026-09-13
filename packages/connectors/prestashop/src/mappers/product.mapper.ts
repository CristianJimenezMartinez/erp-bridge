import { CanonicalProduct } from '@erp-bridge/shared';
import { PrestaShopProduct, PrestaShopCombination } from '../types';
import { PrestaShopXml } from '../utils';

export class PrestaShopProductMapper {
  public static toPsProductPayload(
    product: CanonicalProduct,
    targetId?: number,
    langId = 1
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      reference: product.sku,
      price: (product.salePrice && product.salePrice > 0 ? product.salePrice : product.regularPrice).toFixed(6),
      wholesale_price: product.costPrice ? product.costPrice.toFixed(6) : '0.000000',
      active: product.status === 'published' ? 1 : 0,
      name: PrestaShopXml.toLanguageNode(product.name, langId),
      description: PrestaShopXml.toLanguageNode(product.description || '', langId),
      description_short: PrestaShopXml.toLanguageNode(product.shortDescription || '', langId),
      link_rewrite: PrestaShopXml.toLanguageNode(
        product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto',
        langId
      ),
      weight: product.weight ? String(product.weight) : '0.000000',
      ean13: product.barcode || '',
    };

    if (targetId) {
      payload['id'] = targetId;
    }

    if (product.categories && product.categories.length > 0) {
      payload['associations'] = {
        categories: {
          category: product.categories.map((c: { id: string }) => ({ id: c.id })),
        },
      };
    }

    return payload;
  }

  public static toCanonicalProduct(
    raw: PrestaShopProduct,
    combinations?: PrestaShopCombination[]
  ): CanonicalProduct {
    const id = String(raw.id);
    const sku = raw.reference && raw.reference.trim() ? raw.reference.trim() : `PS-${id}`;
    const name = PrestaShopXml.extractLanguageText(raw.name) || `Producto ${sku}`;
    const description = PrestaShopXml.extractLanguageText(raw.description);
    const shortDescription = PrestaShopXml.extractLanguageText(raw.description_short);
    const regularPrice = parseFloat(String(raw.price || '0')) || 0;
    const costPrice = raw.wholesale_price ? parseFloat(String(raw.wholesale_price)) : undefined;
    const isActive = Number(raw.active) === 1;

    const attributes: Record<string, string> = {};
    if (combinations && combinations.length > 0) {
      attributes['has_combinations'] = 'true';
      attributes['combinations_count'] = String(combinations.length);
    }

    return {
      id,
      sku,
      name,
      description,
      shortDescription,
      regularPrice,
      costPrice,
      stockQuantity: 0,
      manageStock: true,
      inStock: true,
      status: isActive ? 'published' : 'draft',
      barcode: raw.ean13 || undefined,
      weight: raw.weight ? parseFloat(String(raw.weight)) : undefined,
      categories: (raw.associations?.categories || []).map((c) => ({
        id: String(c.id),
        name: `Categoria ${c.id}`,
      })),
      images: [],
      attributes,
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }
}
