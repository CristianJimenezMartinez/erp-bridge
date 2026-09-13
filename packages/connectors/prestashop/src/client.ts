import axios, { AxiosInstance } from 'axios';
import { ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { Logger } from '@erp-bridge/shared';
import { PrestaShopConfig } from './types';
import { PrestaShopXml } from './utils';

export class PrestaShopClient {
  private readonly logger = new Logger('PrestaShopClient');
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly config: PrestaShopConfig) {
    let cleanUrl = config.url.trim().replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    this.baseUrl = cleanUrl;

    const authHeader = `Basic ${Buffer.from(`${config.apiKey.trim()}:`).toString('base64')}`;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeoutMs || 20000,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json, text/xml',
      },
    });
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getConfig(): PrestaShopConfig {
    return this.config;
  }

  public async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const mergedParams = { output_format: 'JSON', ...params };
      const normalizedPath = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
      const response = await this.http.get(normalizedPath, { params: mergedParams });
      return response.data as T;
    } catch (error: unknown) {
      throw this.handleError(error, `GET ${endpoint}`);
    }
  }

  public async post<T = unknown>(resource: string, payload: string | Record<string, unknown>): Promise<T> {
    try {
      const normalizedPath = resource.startsWith('/') ? resource : `/api/${resource}`;
      const tag = resource.split('/')[0] || resource;
      const xmlBody = typeof payload === 'string' ? payload : PrestaShopXml.build(tag, payload);
      const response = await this.http.post(normalizedPath, xmlBody, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
      return this.parseResponseData<T>(response.data);
    } catch (error: unknown) {
      throw this.handleError(error, `POST ${resource}`);
    }
  }

  public async put<T = unknown>(resource: string, payload: string | Record<string, unknown>): Promise<T> {
    try {
      const normalizedPath = resource.startsWith('/') ? resource : `/api/${resource}`;
      const tag = resource.split('/')[0] || resource;
      const xmlBody = typeof payload === 'string' ? payload : PrestaShopXml.build(tag, payload);
      const response = await this.http.put(normalizedPath, xmlBody, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
      return this.parseResponseData<T>(response.data);
    } catch (error: unknown) {
      throw this.handleError(error, `PUT ${resource}`);
    }
  }

  public async postModule<T = unknown>(modulePath: string, jsonPayload: unknown): Promise<T> {
    try {
      const cleanPath = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
      const response = await this.http.post(cleanPath, jsonPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data as T;
    } catch (error: unknown) {
      throw this.handleError(error, `POST ${modulePath}`);
    }
  }

  private parseResponseData<T>(data: unknown): T {
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      return PrestaShopXml.parse<T>(data);
    }
    return data as T;
  }

  private handleError(error: unknown, action: string): ConnectionError {
    const err = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
      code?: string;
    };
    const status = err?.response?.status;
    const msg = err?.message || 'Error de comunicación con PrestaShop';
    this.logger.error(`Fallo en ${action}: ${msg}`, error, { status });

    if (status === 401 || status === 403) {
      return new ConnectionError(
        ErrorCode.CONNECTION_AUTH_FAILED,
        `Fallo de autenticación en PrestaShop (HTTP ${status}): Revise API Key y permisos de Web Service`,
        { status },
        false
      );
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ConnectionError(
        ErrorCode.CONNECTION_TIMEOUT,
        `Tiempo de espera agotado al conectar con PrestaShop: ${this.baseUrl}`,
        { timeout: true },
        true
      );
    }
    return new ConnectionError(
      ErrorCode.CONNECTION_FAILED,
      `Error de PrestaShop WebService: ${msg}`,
      { status, data: err?.response?.data },
      status ? status >= 500 : true
    );
  }
}
