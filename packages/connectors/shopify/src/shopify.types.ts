import { CanonicalOrder } from '@erp-bridge/shared';

export interface ShopifyConnectorConfig {
  shopSubdomain: string;
  accessToken: string;
  apiVersion?: string; // Default: '2026-01'
  locationId?: string; // e.g. 'gid://shopify/Location/12345678'
  timeoutMs?: number;
  rateLimitMinimumPoints?: number; // Default: 100
}

export type ConnectorType = 'SOURCE' | 'DESTINATION' | 'BIDIRECTIONAL';

export interface CanonicalStockUpdate {
  sku: string;
  quantity: number;
  availableQuantity?: number; // DISSTO disponible anti-overselling
  inventoryItemId?: string;
  locationId?: string;
  warehouse?: string;
}

export interface SyncResult {
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  errors?: Array<{ sku: string; error: string }>;
}

export interface CanonicalTax {
  name: string;
  rate: number;
  amount: number;
  isEquivalenceSurcharge?: boolean;
}

export interface IConnector {
  readonly id: string;
  readonly name: string;
  readonly type: ConnectorType;
  testConnection(): Promise<{ success: boolean; latencyMs: number }>;
  pushStockBatch(updates: CanonicalStockUpdate[]): Promise<SyncResult>;
  pullRecentOrders(since: Date): Promise<CanonicalOrder[]>;
  acknowledgeOrder(remoteOrderId: string): Promise<void>;
}

declare module '@erp-bridge/sdk' {
  export interface IConnector {
    readonly id: string;
    readonly name: string;
    readonly type: 'SOURCE' | 'DESTINATION' | 'BIDIRECTIONAL';
    testConnection(): Promise<{ success: boolean; latencyMs: number }>;
    pushStockBatch(updates: CanonicalStockUpdate[]): Promise<SyncResult>;
    pullRecentOrders(since: Date): Promise<CanonicalOrder[]>;
    acknowledgeOrder(remoteOrderId: string): Promise<void>;
  }
}

export interface ShopifyThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

export interface ShopifyQueryCost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: ShopifyThrottleStatus;
}

export interface ShopifyGraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
  extensions?: {
    cost?: ShopifyQueryCost;
    [key: string]: unknown;
  };
}

export interface ShopifyMoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface ShopifyPriceSet {
  shopMoney: ShopifyMoneyV2;
}

export interface ShopifyTaxLine {
  title: string;
  rate?: number;
  ratePercentage?: number;
  priceSet?: ShopifyPriceSet;
}

export interface ShopifyLineItemEdge {
  node: {
    id: string;
    title: string;
    sku?: string | null;
    quantity: number;
    originalUnitPriceSet?: ShopifyPriceSet;
    discountedUnitPriceSet?: ShopifyPriceSet;
    totalDiscountSet?: ShopifyPriceSet;
    originalTotalSet?: ShopifyPriceSet;
    discountedTotalSet?: ShopifyPriceSet;
    taxLines?: ShopifyTaxLine[];
  };
}

export interface ShopifyAddress {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  countryCodeV2?: string | null;
  phone?: string | null;
}

export interface ShopifyCustomerMetafield {
  node: {
    namespace: string;
    key: string;
    value: string;
  };
}

export interface ShopifyCustomer {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[] | string;
  metafields?: {
    edges: ShopifyCustomerMetafield[];
  };
}

export interface ShopifyOrderNode {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  displayFinancialStatus?: string;
  displayFulfillmentStatus?: string;
  totalPriceSet?: ShopifyPriceSet;
  totalTaxSet?: ShopifyPriceSet;
  totalShippingPriceSet?: ShopifyPriceSet;
  totalDiscountsSet?: ShopifyPriceSet;
  subtotalPriceSet?: ShopifyPriceSet;
  taxLines?: ShopifyTaxLine[];
  note?: string | null;
  tags?: string[] | string;
  customer?: ShopifyCustomer | null;
  shippingAddress?: ShopifyAddress | null;
  billingAddress?: ShopifyAddress | null;
  lineItems?: {
    edges: ShopifyLineItemEdge[];
  };
  customAttributes?: Array<{ key: string; value: string }>;
}

export interface ShopifyOrdersQueryData {
  orders: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
    edges: Array<{ node: ShopifyOrderNode }>;
  };
}

export interface ShopifyInventorySetQuantitiesInput {
  name: string;
  reason: string;
  ignoreCompareQuantity?: boolean;
  quantities: Array<{
    inventoryItemId: string;
    locationId: string;
    quantity: number;
  }>;
}

export interface ShopifyInventorySetQuantitiesResponse {
  inventorySetQuantities?: {
    inventoryAdjustmentGroup?: {
      id: string;
      reason: string;
      changes: Array<{
        name: string;
        delta: number;
        quantityAfterChange: number;
        item?: { id: string; sku?: string };
        location?: { id: string };
      }>;
    };
    userErrors?: Array<{
      field: string[];
      message: string;
      code?: string;
    }>;
  };
}

export interface ShopifyProductVariantsQueryData {
  productVariants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        inventoryItem: {
          id: string;
        };
      };
    }>;
  };
}
