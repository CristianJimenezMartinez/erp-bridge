import { Logger } from '@erp-bridge/shared';
import { ShopifyRateLimiter } from './shopify.rate-limiter';
import {
  ShopifyConnectorConfig,
  ShopifyGraphQLResponse,
} from './shopify.types';

export class ShopifyClient {
  private readonly logger = new Logger('ShopifyClient');
  private readonly config: ShopifyConnectorConfig;
  private readonly endpointUrl: string;
  private readonly rateLimiter: ShopifyRateLimiter;

  constructor(config: ShopifyConnectorConfig, rateLimiter?: ShopifyRateLimiter) {
    this.config = config;
    const cleanSubdomain = config.shopSubdomain
      .replace(/^https?:\/\//i, '')
      .replace(/\.myshopify\.com.*$/i, '')
      .replace(/\/.*$/, '')
      .trim();

    const apiVersion = config.apiVersion || '2026-01';
    this.endpointUrl = `https://${cleanSubdomain}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    this.rateLimiter = rateLimiter || new ShopifyRateLimiter(config.rateLimitMinimumPoints ?? 100);
  }

  public getRateLimiter(): ShopifyRateLimiter {
    return this.rateLimiter;
  }

  public getEndpointUrl(): string {
    return this.endpointUrl;
  }

  public async request<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    estimatedCost: number = 10
  ): Promise<ShopifyGraphQLResponse<T>> {
    return this.rateLimiter.schedule(async () => {
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await fetch(this.endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': this.config.accessToken,
              Accept: 'application/json',
            },
            body: JSON.stringify({ query, variables }),
            signal: this.config.timeoutMs ? AbortSignal.timeout(this.config.timeoutMs) : undefined,
          });

          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : 2;
            const waitMs = Math.ceil(retryAfterSec * 1000);
            this.logger.warn('Shopify HTTP 429 received. Backing off.', { waitMs, attempt: attempts });
            await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
            continue;
          }

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error(`Shopify GraphQL HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
          }

          const result = (await response.json()) as ShopifyGraphQLResponse<T>;

          if (result.extensions?.cost?.throttleStatus) {
            this.rateLimiter.updateThrottleStatus(result.extensions.cost.throttleStatus);
          }

          if (result.errors && result.errors.length > 0) {
            const errorMessages = result.errors.map((e) => e.message).join('; ');
            this.logger.warn('Shopify GraphQL execution errors', { errorMessages });
          }

          return result;
        } catch (error: unknown) {
          if (attempts >= maxAttempts) {
            this.logger.error('Shopify GraphQL request failed after retries', {
              error: (error as Error).message,
              attempts,
            });
            throw error;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 500 * attempts));
        }
      }

      throw new Error('Shopify GraphQL request exhausted all attempts');
    }, estimatedCost);
  }
}
