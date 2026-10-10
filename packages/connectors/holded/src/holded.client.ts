import { Logger } from '@erp-bridge/shared';
import { HoldedRateLimiter } from './holded.rate-limiter';
import {
  HoldedConnectorConfig,
  HoldedContact,
  HoldedProduct,
  HoldedSalesOrder,
} from './holded.types';

export class HoldedClient {
  private readonly logger = new Logger('HoldedClient');
  private readonly config: HoldedConnectorConfig;
  private readonly baseUrl: string;
  private readonly rateLimiter: HoldedRateLimiter;

  constructor(config: HoldedConnectorConfig, rateLimiter?: HoldedRateLimiter) {
    this.config = config;
    const base = config.endpointUrl || 'https://api.holded.com/api/v1';
    this.baseUrl = base.replace(/\/+$/, '');
    this.rateLimiter = rateLimiter || new HoldedRateLimiter(config.maxRequestsPerMinute ?? 250);
  }

  public getRateLimiter(): HoldedRateLimiter {
    return this.rateLimiter;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async request<T = unknown>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      cost?: number;
    } = {}
  ): Promise<T> {
    const { method = 'GET', params, body, cost = 1 } = options;

    return this.rateLimiter.schedule(async () => {
      let attempts = 0;
      const maxAttempts = 3;

      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      let url = `${this.baseUrl}${cleanPath}`;

      if (params) {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) query.append(k, String(v));
        }
        const qs = query.toString();
        if (qs) url += `?${qs}`;
      }

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetch(url, {
            method,
            headers: {
              key: this.config.apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: this.config.timeoutMs ? AbortSignal.timeout(this.config.timeoutMs) : undefined,
          });

          if (response.status === 401) {
            const errText = await response.text().catch(() => '');
            this.logger.error('Holded API 401 Unauthorized - invalid API key', { errText });
            throw new Error(`Holded API 401 Unauthorized: Invalid or missing API key (${errText || 'Unauthorized'})`);
          }

          if (response.status === 429) {
            const retryHeader = response.headers.get('Retry-After');
            const retrySec = retryHeader ? parseFloat(retryHeader) : 1;
            const waitMs = Math.ceil(retrySec * 1000);
            this.logger.warn('Holded API HTTP 429 rate limit exceeded. Pausing.', { waitMs, attempt: attempts });
            await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
            continue;
          }

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            if (response.status >= 500 && attempts < maxAttempts) {
              this.logger.warn(`Holded API HTTP ${response.status} error. Retrying...`, { attempts });
              await new Promise<void>((resolve) => setTimeout(resolve, 500 * attempts));
              continue;
            }
            throw new Error(`Holded API HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
          }

          return (await response.json()) as T;
        } catch (error: unknown) {
          const msg = (error as Error).message || '';
          if (msg.includes('401 Unauthorized')) {
            throw error;
          }

          if (attempts >= maxAttempts) {
            this.logger.error('Holded API request exhausted all attempts', { error: msg, attempts });
            throw error;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 500 * attempts));
        }
      }

      throw new Error('Holded API request failed after retries');
    }, cost);
  }

  public async testConnection(): Promise<{ success: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.getContacts({ limit: 1 });
      const latencyMs = Date.now() - start;
      this.logger.info('Holded connection verified successfully', { latencyMs });
      return { success: true, latencyMs };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      this.logger.error('Holded connection test failed', { error: (err as Error).message, latencyMs });
      return { success: false, latencyMs };
    }
  }

  public async getProducts(params?: Record<string, string | number>): Promise<HoldedProduct[]> {
    return this.request<HoldedProduct[]>('/invoicing/v1/products', { method: 'GET', params });
  }

  public async getProduct(id: string): Promise<HoldedProduct> {
    return this.request<HoldedProduct>(`/invoicing/v1/products/${id}`, { method: 'GET' });
  }

  public async updateStock(
    id: string,
    stock: number | { stock: number; warehouseId?: string }
  ): Promise<{ status: number; info?: string }> {
    const payload = typeof stock === 'number'
      ? { stock, warehouseId: this.config.defaultWarehouseId }
      : { stock: stock.stock, warehouseId: stock.warehouseId || this.config.defaultWarehouseId };
    return this.request<{ status: number; info?: string }>(`/invoicing/v1/products/${id}/stock`, {
      method: 'PUT',
      body: payload,
    });
  }

  public async createSalesOrder(order: HoldedSalesOrder): Promise<{ status: number; id: string; info?: string }> {
    return this.request<{ status: number; id: string; info?: string }>('/invoicing/v1/documents/salesorder', {
      method: 'POST',
      body: order,
    });
  }

  public async getContacts(params?: Record<string, string | number>): Promise<HoldedContact[]> {
    return this.request<HoldedContact[]>('/invoicing/v1/contacts', { method: 'GET', params });
  }

  public async createContact(contact: HoldedContact): Promise<{ status: number; id: string; info?: string }> {
    return this.request<{ status: number; id: string; info?: string }>('/invoicing/v1/contacts', {
      method: 'POST',
      body: contact,
    });
  }
}
