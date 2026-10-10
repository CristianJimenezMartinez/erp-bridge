import {
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
} from '@erp-bridge/sdk';
import {
  CanonicalOrder,
  Logger,
} from '@erp-bridge/shared';
import { ShopifyClient } from './shopify.client';
import { ShopifyOrderMapper } from './shopify.mapper';
import {
  CanonicalStockUpdate,
  ConnectorType,
  IConnector,
  ShopifyConnectorConfig,
  ShopifyInventorySetQuantitiesResponse,
  ShopifyOrdersQueryData,
  ShopifyProductVariantsQueryData,
  SyncResult,
} from './shopify.types';

export class ShopifyConnector implements IConnector, Connector {
  public readonly id = 'chan_shopify';
  public readonly name = 'Shopify Store Channel';
  public readonly type: ConnectorType = 'DESTINATION';

  private readonly logger = new Logger('ShopifyConnector');
  private client: ShopifyClient;
  private config: ShopifyConnectorConfig;

  constructor(config: ShopifyConnectorConfig, client?: ShopifyClient) {
    this.config = config;
    this.client = client || new ShopifyClient(config);
  }

  public getMetadata(): ConnectorMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: 'shopify',
      version: '0.3.8',
      author: 'Bentian / ERP Bridge',
      description: 'Conector Cloud GraphQL oficial para tiendas Shopify con soporte de stock DISSTO y R.E.',
      icon: 'shopify',
    };
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      supportsReadProducts: false,
      supportsWriteProducts: false,
      supportsReadStock: false,
      supportsWriteStock: true,
      supportsBatchOperations: true,
      supportsReadOrders: true,
      supportsWriteOrders: false,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const raw = { ...config.configuration, ...config.credentials } as unknown as ShopifyConnectorConfig;
    this.config = { ...this.config, ...raw };
    this.client = new ShopifyClient(this.config);
  }

  public async disconnect(): Promise<void> {
    this.logger.info('Shopify channel disconnected');
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    const res = await this.testConnection();
    return {
      status: res.success ? 'HEALTHY' : 'DOWN',
      latencyMs: res.latencyMs,
    };
  }

  public async testConnection(): Promise<{ success: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const query = `query testConnection { shop { id name myshopifyDomain } }`;
      const response = await this.client.request<{ shop?: { id: string; name: string } }>(query, undefined, 5);
      const latencyMs = Date.now() - start;

      if (response.data?.shop?.id) {
        this.logger.info('Shopify connection verified', { shopName: response.data.shop.name, latencyMs });
        return { success: true, latencyMs };
      }

      this.logger.warn('Shopify connection test returned empty data', { latencyMs });
      return { success: false, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      this.logger.error('Shopify connection test failed', { error: (err as Error).message, latencyMs });
      return { success: false, latencyMs };
    }
  }

  public async pushStockBatch(updates: CanonicalStockUpdate[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      total: updates.length,
      updated: 0,
      failed: 0,
      errors: [],
    };

    if (updates.length === 0) return result;

    const resolvedLocationId = await this.resolveLocationId(updates[0]?.locationId);
    const skuMap = await this.resolveInventoryItemIds(updates);

    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      const validQuantities: Array<{ inventoryItemId: string; locationId: string; quantity: number }> = [];

      for (const update of chunk) {
        const invId = update.inventoryItemId || skuMap.get(update.sku);
        if (!invId) {
          result.failed++;
          result.errors?.push({ sku: update.sku, error: `SKU ${update.sku} not found in Shopify inventory` });
          continue;
        }

        const formattedInvId = invId.startsWith('gid://') ? invId : `gid://shopify/InventoryItem/${invId}`;
        const locId = update.locationId ? (update.locationId.startsWith('gid://') ? update.locationId : `gid://shopify/Location/${update.locationId}`) : resolvedLocationId;
        const availableQuantity = update.availableQuantity !== undefined ? update.availableQuantity : update.quantity;
        const finalQuantity = Math.max(0, Math.floor(availableQuantity));

        validQuantities.push({
          inventoryItemId: formattedInvId,
          locationId: locId,
          quantity: finalQuantity,
        });
      }

      if (validQuantities.length === 0) continue;

      try {
        const mutation = `
          mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
              inventoryAdjustmentGroup { id }
              userErrors { field message code }
            }
          }
        `;
        const res = await this.client.request<ShopifyInventorySetQuantitiesResponse>(
          mutation,
          { input: { name: 'available', reason: 'correction', ignoreCompareQuantity: true, quantities: validQuantities } },
          10 + validQuantities.length
        );

        const userErrors = res.data?.inventorySetQuantities?.userErrors || [];
        if (userErrors.length > 0) {
          const errMsg = userErrors.map((u) => u.message).join('; ');
          this.logger.warn('Shopify inventorySetQuantities partial failure', { errMsg });
          result.failed += validQuantities.length;
          result.errors?.push({ sku: chunk.map((c) => c.sku).join(','), error: errMsg });
        } else {
          result.updated += validQuantities.length;
        }
      } catch (err: unknown) {
        result.failed += validQuantities.length;
        result.errors?.push({ sku: chunk.map((c) => c.sku).join(','), error: (err as Error).message });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  public async pullRecentOrders(since: Date): Promise<CanonicalOrder[]> {
    const isoDate = since.toISOString();
    const queryStr = `financial_status:paid created_at:>=${isoDate}`;
    const graphqlQuery = `
      query getPaidOrders($query: String!) {
        orders(first: 50, query: $query, sortKey: CREATED_AT) {
          edges {
            node {
              id name createdAt updatedAt displayFinancialStatus displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              totalTaxSet { shopMoney { amount currencyCode } }
              totalShippingPriceSet { shopMoney { amount currencyCode } }
              totalDiscountsSet { shopMoney { amount currencyCode } }
              subtotalPriceSet { shopMoney { amount currencyCode } }
              taxLines { title rate ratePercentage priceSet { shopMoney { amount currencyCode } } }
              note tags
              customer {
                id firstName lastName displayName email phone tags
                metafields(first: 10) { edges { node { namespace key value } } }
              }
              shippingAddress { firstName lastName company address1 address2 city province zip countryCodeV2 phone }
              billingAddress { firstName lastName company address1 address2 city province zip countryCodeV2 phone }
              lineItems(first: 100) {
                edges {
                  node {
                    id title sku quantity
                    originalUnitPriceSet { shopMoney { amount currencyCode } }
                    discountedUnitPriceSet { shopMoney { amount currencyCode } }
                    totalDiscountSet { shopMoney { amount currencyCode } }
                    originalTotalSet { shopMoney { amount currencyCode } }
                    discountedTotalSet { shopMoney { amount currencyCode } }
                    taxLines { title rate ratePercentage priceSet { shopMoney { amount currencyCode } } }
                  }
                }
              }
              customAttributes { key value }
            }
          }
        }
      }
    `;

    const res = await this.client.request<ShopifyOrdersQueryData>(graphqlQuery, { query: queryStr }, 25);
    const orderEdges = res.data?.orders?.edges || [];
    const canonicalOrders: CanonicalOrder[] = [];

    for (const edge of orderEdges) {
      const orderNode = edge.node;
      const finStatus = (orderNode.displayFinancialStatus || '').toUpperCase();
      if (finStatus !== 'PAID') continue;

      const canonical = ShopifyOrderMapper.toCanonicalOrder(orderNode);
      canonicalOrders.push(canonical);
    }

    return canonicalOrders;
  }

  public async acknowledgeOrder(remoteOrderId: string): Promise<void> {
    const cleanId = remoteOrderId.replace(/\D/g, '');
    const gid = remoteOrderId.startsWith('gid://') ? remoteOrderId : `gid://shopify/Order/${cleanId}`;
    const mutation = `
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }
    `;

    try {
      const res = await this.client.request<{ tagsAdd?: { userErrors?: Array<{ message: string }> } }>(
        mutation,
        { id: gid, tags: ['erp-synced', 'acknowledged'] },
        10
      );
      const errors = res.data?.tagsAdd?.userErrors || [];
      if (errors.length > 0) {
        this.logger.warn('Shopify acknowledgeOrder had userErrors', { gid, errors: errors.map((e) => e.message) });
      }
    } catch (err: unknown) {
      this.logger.error('Shopify acknowledgeOrder failed', { gid, error: (err as Error).message });
      throw err;
    }
  }

  private async resolveLocationId(providedLocationId?: string): Promise<string> {
    if (providedLocationId) {
      return providedLocationId.startsWith('gid://') ? providedLocationId : `gid://shopify/Location/${providedLocationId}`;
    }
    if (this.config.locationId) {
      const cfgId = this.config.locationId;
      return cfgId.startsWith('gid://') ? cfgId : `gid://shopify/Location/${cfgId}`;
    }

    try {
      const query = `query getLocations { locations(first: 1) { edges { node { id } } } }`;
      const res = await this.client.request<{ locations?: { edges: Array<{ node: { id: string } }> } }>(query, undefined, 5);
      const locId = res.data?.locations?.edges?.[0]?.node?.id;
      if (locId) return locId;
    } catch {
      // Fallback
    }

    return 'gid://shopify/Location/default';
  }

  private async resolveInventoryItemIds(updates: CanonicalStockUpdate[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const missingSkus = updates.filter((u) => !u.inventoryItemId).map((u) => u.sku);
    if (missingSkus.length === 0) return map;

    try {
      const skuQuery = missingSkus.map((s) => `sku:${s}`).join(' OR ');
      const query = `
        query getVariantsBySku($query: String!) {
          productVariants(first: 50, query: $query) {
            edges { node { sku inventoryItem { id } } }
          }
        }
      `;
      const res = await this.client.request<ShopifyProductVariantsQueryData>(query, { query: skuQuery }, 15);
      for (const edge of res.data?.productVariants?.edges || []) {
        if (edge.node.sku && edge.node.inventoryItem?.id) {
          map.set(edge.node.sku, edge.node.inventoryItem.id);
        }
      }
    } catch (err: unknown) {
      this.logger.warn('Failed resolving inventory item IDs for SKUs', { error: (err as Error).message });
    }

    return map;
  }
}
