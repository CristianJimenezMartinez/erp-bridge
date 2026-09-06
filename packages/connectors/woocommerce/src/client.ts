import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';

export interface WooCommerceClientOptions {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: 'wc/v3';
  queryStringAuth?: boolean;
  timeoutMs?: number;
}

export class WooCommerceClient {
  private readonly logger = new Logger('WooCommerceClient');
  private api: WooCommerceRestApi;
  private readonly baseUrl: string;

  constructor(options: WooCommerceClientOptions) {
    let cleanUrl = options.url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    this.baseUrl = cleanUrl;

    this.api = new WooCommerceRestApi({
      url: cleanUrl,
      consumerKey: options.consumerKey.trim(),
      consumerSecret: options.consumerSecret.trim(),
      version: options.version || 'wc/v3',
      queryStringAuth: options.queryStringAuth ?? true,
      axiosConfig: {
        timeout: options.timeoutMs || 15000,
      },
    });
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.api.get(endpoint, params);
      return response.data as T;
    } catch (error: unknown) {
      throw this.handleError(error, `GET ${endpoint}`);
    }
  }

  public async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data as T;
    } catch (error: unknown) {
      throw this.handleError(error, `POST ${endpoint}`);
    }
  }

  public async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data as T;
    } catch (error: unknown) {
      throw this.handleError(error, `PUT ${endpoint}`);
    }
  }

  private handleError(error: unknown, action: string): ConnectionError {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          code?: string;
          message?: string;
          data?: { status?: number };
        };
      };
      message?: string;
      code?: string;
    };

    const status = err?.response?.status || err?.response?.data?.data?.status;
    const serverMessage = err?.response?.data?.message || err?.message || 'Error en petición WooCommerce';
    const serverCode = err?.response?.data?.code || err?.code || 'WOO_ERROR';

    this.logger.error(`Error en ${action}: ${serverMessage}`, error, { status, serverCode });

    if (status === 401 || status === 403) {
      return new ConnectionError(
        ErrorCode.CONNECTION_AUTH_FAILED,
        `Fallo de autenticación en WooCommerce (HTTP ${status}): ${serverMessage}`,
        { status, serverCode, rawMessage: serverMessage },
        false
      );
    }

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ConnectionError(
        ErrorCode.CONNECTION_TIMEOUT,
        `Tiempo de espera agotado al conectar con WooCommerce: ${this.baseUrl}`,
        { timeout: true, baseUrl: this.baseUrl },
        true
      );
    }

    return new ConnectionError(
      ErrorCode.CONNECTION_FAILED,
      `Error de comunicación con WooCommerce: ${serverMessage}`,
      { status, serverCode, baseUrl: this.baseUrl },
      status ? status >= 500 : true
    );
  }
}
