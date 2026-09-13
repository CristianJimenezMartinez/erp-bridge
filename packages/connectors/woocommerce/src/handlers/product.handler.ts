import {
  BatchSyncResult,
  ProductMutationResult,
  ReadProductsOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { WooCommerceClient } from '../client';
import {
  mapCanonicalToWooCommerce,
  mapWooCommerceToCanonical,
  WooCommerceProductPayload,
} from '../mappers';
import { BatchThrottler } from './throttler';

export class WooCommerceProductHandler {
  constructor(
    private readonly client: WooCommerceClient,
    private readonly logger: Logger
  ) {}

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    const requestedLimit = options?.limit;
    const pageSize = Math.min(requestedLimit || 100, 100);
    let page = options?.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
    const allProducts: CanonicalProduct[] = [];
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, unknown> = {
        per_page: pageSize,
        page,
      };

      if (options?.modifiedSince) {
        params['after'] = options.modifiedSince.toISOString();
      }

      const response = await this.client.get<Array<Record<string, unknown>>>('products', params);
      if (!Array.isArray(response) || response.length === 0) {
        break;
      }

      for (const item of response) {
        allProducts.push(mapWooCommerceToCanonical(item));
        if (requestedLimit && allProducts.length >= requestedLimit) {
          hasMore = false;
          break;
        }
      }

      if (response.length < pageSize) {
        hasMore = false;
      }

      page++;
    }

    return allProducts;
  }

  public async createProduct(product: CanonicalProduct): Promise<ProductMutationResult> {
    try {
      const payload = mapCanonicalToWooCommerce(product);
      const response = await this.client.post<{ id: number; sku: string }>('products', payload);
      return { success: true, externalId: String(response.id), sku: product.sku, rawResponse: response };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, externalId: '', sku: product.sku, error: msg };
    }
  }

  public async updateProduct(
    product: CanonicalProduct,
    targetIdentifier?: string,
    options?: { skipImages?: boolean }
  ): Promise<ProductMutationResult> {
    if (!targetIdentifier) {
      throw new ConnectionError(
        ErrorCode.VALIDATION_ERROR,
        `Se requiere el ID externo de WooCommerce para actualizar el producto SKU: ${product.sku}`
      );
    }

    try {
      const numericId = parseInt(targetIdentifier, 10);
      const skipImages = options?.skipImages ?? true;
      const payload = mapCanonicalToWooCommerce(product, numericId, { skipImages });
      const response = await this.client.put<{ id: number; sku: string }>(`products/${numericId}`, payload);
      return { success: true, externalId: String(response.id), sku: product.sku, rawResponse: response };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, externalId: targetIdentifier, sku: product.sku, error: msg };
    }
  }

  public async batchUpsertProducts(
    products: CanonicalProduct[],
    existingMappings?: Map<string, string>,
    options?: { skipImagesOnUpdate?: boolean }
  ): Promise<BatchSyncResult> {
    const creates: WooCommerceProductPayload[] = [];
    const updates: WooCommerceProductPayload[] = [];
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];
    const skipImagesOnUpdate = options?.skipImagesOnUpdate ?? true;

    for (const product of products) {
      const targetIdStr = existingMappings?.get(product.sku);
      if (targetIdStr) {
        const targetId = parseInt(targetIdStr, 10);
        updates.push(mapCanonicalToWooCommerce(product, targetId, { skipImages: skipImagesOnUpdate }));
      } else {
        creates.push(mapCanonicalToWooCommerce(product));
      }
    }

    let succeeded = 0;
    let failed = 0;

    const processBatch = async (action: 'create' | 'update', payloads: WooCommerceProductPayload[]) => {
      if (payloads.length === 0) return;
      await BatchThrottler.processChunks(
        payloads,
        async (chunk) => {
          try {
            const response = await this.client.post<{
              create?: Array<{ id: number; sku: string; error?: { message: string } }>;
              update?: Array<{ id: number; sku: string; error?: { message: string } }>;
            }>('products/batch', { [action]: chunk });

            const items = response[action];
            if (items) {
              for (const item of items) {
                if (item.error) {
                  failed++;
                  itemResults.push({ sku: item.sku, success: false, error: item.error.message });
                } else {
                  succeeded++;
                  itemResults.push({ sku: item.sku, success: true, externalId: String(item.id) });
                }
              }
            }
          } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            for (const item of chunk) {
              failed++;
              itemResults.push({ sku: item.sku, success: false, error: errMessage });
            }
          }
          return [];
        },
        this.logger
      );
    };

    await processBatch('create', creates);
    await processBatch('update', updates);

    return {
      total: products.length,
      succeeded,
      failed,
      items: itemResults,
    };
  }
}
