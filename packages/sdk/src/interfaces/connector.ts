import {
  CanonicalCustomer,
  CanonicalInvoice,
  CanonicalOrder,
  CanonicalProduct,
  CanonicalStock,
  OrderStatus,
} from '@erp-bridge/shared';
import { ConnectorCapabilities } from '../capabilities';

export type HealthStatusType = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface HealthCheckResult {
  status: HealthStatusType;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  docsUrl?: string;
}

export interface ConnectionConfig {
  connectionId?: string;
  organizationId?: string;
  configuration: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface ReadProductsOptions {
  limit?: number;
  offset?: number;
  modifiedSince?: Date;
  activeOnly?: boolean;
}

export interface ProductMutationResult {
  success: boolean;
  externalId: string;
  sku: string;
  error?: string;
  rawResponse?: unknown;
}

export interface BatchItemResult {
  sku: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface BatchSyncResult {
  total: number;
  succeeded: number;
  failed: number;
  items: BatchItemResult[];
}

export interface ReadOrdersOptions {
  limit?: number;
  offset?: number;
  status?: OrderStatus | string;
  modifiedSince?: Date;
  createdSince?: Date;
}

export interface OrderMutationResult {
  success: boolean;
  orderId: string;
  externalId: string;
  orderNumber?: string;
  status?: OrderStatus | string;
  error?: string;
  rawResponse?: unknown;
}

export interface CustomerMutationResult {
  success: boolean;
  customerId: string;
  externalId: string;
  error?: string;
  rawResponse?: unknown;
}

export interface ReadStockOptions {
  skus?: string[];
  warehouse?: string;
  modifiedSince?: Date;
  limit?: number;
  offset?: number;
}

export interface StockMutationResult {
  success: boolean;
  sku: string;
  externalId?: string;
  stockQuantity: number;
  inStock: boolean;
  error?: string;
  rawResponse?: unknown;
}

export interface BatchStockUpdateResult {
  total: number;
  succeeded: number;
  failed: number;
  items: BatchItemResult[];
}

export interface ReadInvoicesOptions {
  limit?: number;
  offset?: number;
  series?: string;
  modifiedSince?: Date;
  createdSince?: Date;
}

export interface InvoiceMutationResult {
  success: boolean;
  invoiceId: string;
  externalId: string;
  invoiceNumber?: string;
  series?: string;
  status?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface Connector {
  getMetadata(): ConnectorMetadata;
  getCapabilities(): ConnectorCapabilities;
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  
  // Product Operations
  readProducts?(options?: ReadProductsOptions): Promise<CanonicalProduct[]>;
  createProduct?(product: CanonicalProduct): Promise<ProductMutationResult>;
  updateProduct?(product: CanonicalProduct, targetIdentifier?: string): Promise<ProductMutationResult>;
  batchUpsertProducts?(
    products: CanonicalProduct[],
    existingMappings?: Map<string, string>
  ): Promise<BatchSyncResult>;

  // Order Operations
  readOrders?(options?: ReadOrdersOptions): Promise<CanonicalOrder[]>;
  createOrder?(order: CanonicalOrder): Promise<OrderMutationResult>;
  updateOrderStatus?(
    orderId: string,
    status: OrderStatus | string,
    details?: Record<string, unknown>
  ): Promise<OrderMutationResult>;

  // Customer Operations
  findCustomer?(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null>;
  createCustomer?(customer: CanonicalCustomer): Promise<CustomerMutationResult>;

  // Stock Operations
  readStock?(options?: ReadStockOptions): Promise<CanonicalStock[]>;
  updateStock?(sku: string, quantity: number, targetIdentifier?: string): Promise<StockMutationResult>;
  batchUpdateStock?(
    stockUpdates: CanonicalStock[],
    existingMappings?: Map<string, string>
  ): Promise<BatchStockUpdateResult>;

  // Invoice Operations
  readInvoices?(options?: ReadInvoicesOptions): Promise<CanonicalInvoice[]>;
  createInvoice?(invoice: CanonicalInvoice): Promise<InvoiceMutationResult>;
  updateInvoiceStatus?(
    invoiceId: string,
    status: string,
    details?: Record<string, unknown>
  ): Promise<InvoiceMutationResult>;
}
