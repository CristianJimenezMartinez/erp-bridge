import { CanonicalOrder } from '@erp-bridge/shared';

export interface HoldedConnectorConfig {
  apiKey: string;
  defaultWarehouseId?: string;
  endpointUrl?: string; // Por defecto: 'https://api.holded.com/api/v1/'
  timeoutMs?: number;
  maxRequestsPerMinute?: number; // Por defecto: 250
}

export type ConnectorType = 'SOURCE' | 'DESTINATION' | 'BIDIRECTIONAL';

export interface HoldedProduct {
  id: string;
  sku: string;
  name: string;
  desc?: string;
  price: number;
  cost?: number;
  tax: number;
  stock: number;
  kind?: string;
  tags?: string[];
  barcode?: string;
  warehouseStock?: Record<string, number>;
}

export interface HoldedSalesOrderItem {
  sku?: string;
  name: string;
  desc?: string;
  units: number;
  subtotal: number;
  tax: number;
  re?: number;
  discount?: number;
}

export interface HoldedSalesOrder {
  id?: string;
  contactId: string;
  contactCode?: string;
  date: number; // Unix timestamp en segundos
  desc?: string;
  notes?: string;
  items: HoldedSalesOrderItem[];
  warehouseId?: string;
  currency?: string;
  salesChannelId?: string;
}

export interface HoldedContactAddress {
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
}

export interface HoldedContact {
  id?: string;
  name: string;
  code?: string; // NIF / CIF
  email?: string;
  mobile?: string;
  type?: 'client' | 'supplier' | 'lead' | 'debtor' | 'creditor';
  isperson?: boolean;
  billAddress?: HoldedContactAddress;
  customFields?: Array<{ field: string; value: string }>;
}

export interface HoldedRateLimitStatus {
  limit: number;
  remaining: number;
  resetInMs: number;
}

export interface CanonicalStockUpdate {
  sku: string;
  quantity: number;
  availableQuantity?: number; // Anti-overselling DISSTO
  warehouse?: string;
  productId?: string;
}

export interface SyncResult {
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  errors?: Array<{ sku: string; error: string }>;
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
