export interface SalesOrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesOrderRecord {
  id: string;
  channel: 'woocommerce' | 'universal_bridge';
  webOrderId: string;
  orderNumber: string;
  date: string;
  factusolSeries?: string;
  factusolOrderNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  currency: string;
  status: 'synced' | 'pending' | 'failed';
  error?: string;
  lines: SalesOrderLine[];
  shippingAddress?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  retryCount?: number;
  lastRetriedAt?: string;
}

export type SalesLedgerDateRange = 'today' | '7d' | '30d' | 'month' | 'all';

export interface GetSalesOrdersOptions {
  page?: number;
  limit?: number;
  range?: SalesLedgerDateRange | string;
  search?: string;
  status?: 'synced' | 'pending' | 'failed' | 'all';
}

export interface SalesLedgerMetrics {
  totalTodayEur: number;
  ordersTodayCount: number;
  issuesCount: number;
}

export interface PaginatedSalesOrdersResult {
  orders: SalesOrderRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  metrics: SalesLedgerMetrics;
}
