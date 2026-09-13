import {
  BatchSyncResult,
  ProductMutationResult,
  ReadProductsOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { PrestaShopClient } from '../client';
import { PrestaShopProduct, PrestaShopCombination } from '../types';
import { PrestaShopProductMapper } from '../mappers';

export class PrestaShopProductHandler {
  constructor(
    private readonly client: PrestaShopClient,
    private readonly logger: Logger,
    private readonly langId = 1
  ) {}

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    const params: Record<string, unknown> = { display: 'full' };
    if (options?.limit) {
      params['limit'] = `${options.offset || 0},${options.limit}`;
    }
    if (options?.activeOnly) {
      params['filter[active]'] = '[1]';
    }

    const response = await this.client.get<{ products?: PrestaShopProduct[] }>('products', params);
    const rawList = response.products || [];
    const results: CanonicalProduct[] = [];

    for (const raw of rawList) {
      let combinations: PrestaShopCombination[] | undefined;
      if (raw.associations?.combinations && raw.associations.combinations.length > 0) {
        try {
          const combRes = await this.client.get<{ combinations?: PrestaShopCombination[] }>('combinations', {
            'filter[id_product]': `[${raw.id}]`,
            display: 'full',
          });
          combinations = combRes.combinations;
        } catch {
          this.logger.debug(`No se pudieron cargar combinaciones para producto ${raw.id}`);
        }
      }
      results.push(PrestaShopProductMapper.toCanonicalProduct(raw, combinations));
    }
    return results;
  }

  public async createProduct(product: CanonicalProduct): Promise<ProductMutationResult> {
    try {
      const payload = PrestaShopProductMapper.toPsProductPayload(product, undefined, this.langId);
      const res = await this.client.post<{ product?: { id: number } }>('products', payload);
      const createdId = String(res.product?.id || '');

      return {
        success: true,
        sku: product.sku,
        externalId: createdId,
        rawResponse: res,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al crear producto ${product.sku} en PrestaShop`, error);
      return { success: false, sku: product.sku, externalId: '', error: msg };
    }
  }

  public async updateProduct(product: CanonicalProduct, targetIdentifier?: string): Promise<ProductMutationResult> {
    let externalId = targetIdentifier;
    if (!externalId) {
      const existing = await this.client.get<{ products?: Array<{ id: number }> }>('products', {
        'filter[reference]': `[${product.sku}]`,
        display: '[id]',
      });
      if (existing.products?.[0]) {
        externalId = String(existing.products[0].id);
      }
    }

    if (!externalId) {
      throw new ConnectionError(
        ErrorCode.VALIDATION_ERROR,
        `Se requiere el ID externo de PrestaShop para actualizar el producto SKU: ${product.sku}`
      );
    }

    try {
      const numericId = parseInt(externalId, 10);
      const payload = PrestaShopProductMapper.toPsProductPayload(product, numericId, this.langId);
      const res = await this.client.put<{ product?: { id: number } }>(`products/${numericId}`, payload);

      return {
        success: true,
        sku: product.sku,
        externalId,
        rawResponse: res,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar producto ${product.sku} (ID ${externalId})`, error);
      return { success: false, sku: product.sku, externalId, error: msg };
    }
  }

  public async batchUpsertProducts(
    products: CanonicalProduct[],
    existingMappings?: Map<string, string>
  ): Promise<BatchSyncResult> {
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];
    let succeeded = 0;

    for (const product of products) {
      const targetId = existingMappings?.get(product.sku);
      try {
        const res = targetId
          ? await this.updateProduct(product, targetId)
          : await this.createProduct(product);

        if (res.success) {
          succeeded++;
          itemResults.push({ sku: product.sku, success: true, externalId: res.externalId });
        } else {
          itemResults.push({ sku: product.sku, success: false, error: res.error });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        itemResults.push({ sku: product.sku, success: false, error: msg });
      }
    }

    return {
      total: products.length,
      succeeded,
      failed: products.length - succeeded,
      items: itemResults,
    };
  }
}
